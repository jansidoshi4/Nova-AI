"""
PDF Chat Route — RAG with OpenRouter Embeddings + Confidence Scores
"""

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

import io
import os
import uuid
import httpx
import numpy as np

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

try:
    from pypdf import PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        PdfReader = None

load_dotenv()

router = APIRouter()

OPENROUTER_KEY = os.getenv("OPENROUTER_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1"
EMBED_MODEL    = "openai/text-embedding-3-small"
LLM_MODEL      = "google/gemini-2.5-flash"
PDF_BUCKET     = "pdfs"

CHUNK_SIZE    = 500
CHUNK_OVERLAP = 100
TOP_K         = 5

PDF_STORE: dict[str, dict] = {}

# --- Supabase client (uses service role key to bypass RLS) ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class PDFChatMessage(BaseModel):
    role: str
    text: Optional[str] = ""

class PDFChatRequest(BaseModel):
    pdf_id: str
    history: list[PDFChatMessage]


def chunk_text(text: str) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + CHUNK_SIZE])
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return [c.strip() for c in chunks if c.strip()]


async def embed_texts_api(texts: list[str]) -> np.ndarray:
    if not OPENROUTER_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_KEY not set in .env")
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{OPENROUTER_URL}/embeddings",
            headers={
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "Content-Type": "application/json",
            },
            json={"model": EMBED_MODEL, "input": texts, "encoding_format": "float"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Embedding API error {response.status_code}: {response.text[:300]}")
    data = response.json()
    items = sorted(data["data"], key=lambda x: x["index"])
    return np.array([item["embedding"] for item in items], dtype=np.float32)


def cosine_similarity(q_vec: np.ndarray, doc_mat: np.ndarray) -> np.ndarray:
    q_norm = q_vec / (np.linalg.norm(q_vec) + 1e-9)
    d_norms = doc_mat / (np.linalg.norm(doc_mat, axis=1, keepdims=True) + 1e-9)
    return d_norms @ q_norm


def score_to_confidence(score: float) -> str:
    if score >= 0.75:
        return "high"
    elif score >= 0.45:
        return "medium"
    else:
        return "low"


def get_pdf_session_row(pdf_id: str) -> Optional[dict]:
    result = get_supabase().table("pdf_sessions").select("*").eq("id", pdf_id).execute()
    rows = result.data or []
    return rows[0] if rows else None


def upload_pdf_to_storage(user_id: str, pdf_id: str, raw_bytes: bytes) -> str:
    storage_path = f"{user_id}/{pdf_id}.pdf"
    get_supabase().storage.from_(PDF_BUCKET).upload(
        path=storage_path,
        file=raw_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    return storage_path


def download_pdf_from_storage(storage_path: str) -> bytes:
    return get_supabase().storage.from_(PDF_BUCKET).download(storage_path)


async def process_pdf_bytes(raw_bytes: bytes, filename: str) -> dict:
    if PdfReader is None:
        raise HTTPException(status_code=500, detail="pypdf not installed. Run: pip install pypdf")

    reader = PdfReader(io.BytesIO(raw_bytes))
    full_text = "".join((page.extract_text() or "") + "\n" for page in reader.pages)

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from this PDF (may be scanned/image-based).")

    chunks = chunk_text(full_text)
    embeddings = await embed_texts_api(chunks)

    return {
        "chunks": chunks,
        "embeddings": embeddings,
        "filename": filename,
        "pages": len(reader.pages),
        "raw_bytes": raw_bytes,
    }


async def ensure_pdf_loaded(pdf_id: str) -> dict:
    if pdf_id in PDF_STORE:
        return PDF_STORE[pdf_id]

    row = get_pdf_session_row(pdf_id)
    if not row or not row.get("storage_path"):
        raise HTTPException(status_code=404, detail="PDF not found. Please re-upload.")

    try:
        raw_bytes = download_pdf_from_storage(row["storage_path"])
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"PDF file not found in storage: {e}")

    record = await process_pdf_bytes(raw_bytes, row.get("filename", "document.pdf"))
    PDF_STORE[pdf_id] = record
    return record


async def retrieve_chunks(pdf_id: str, question: str) -> tuple[list[str], str]:
    record = await ensure_pdf_loaded(pdf_id)
    q_vec = (await embed_texts_api([question]))[0]
    scores = cosine_similarity(q_vec, record["embeddings"])
    indices = np.argsort(scores)[::-1][:TOP_K]
    top_score = float(scores[indices[0]])
    confidence = score_to_confidence(top_score)
    chunks = [record["chunks"][i] for i in indices]
    return chunks, confidence


def filter_chat_history(history: list[PDFChatMessage]) -> list[PDFChatMessage]:
    """Drop PDF metadata markers and upload confirmations from LLM history."""
    filtered = []
    for msg in history:
        text = msg.text or ""
        if text.startswith("__PDF_INFO__"):
            continue
        if msg.role == "bot" and "uploaded successfully" in text.lower():
            continue
        filtered.append(msg)
    return filtered


def build_rag_messages(context_chunks: list[str], history: list[PDFChatMessage]) -> list[dict]:
    context_str = "\n\n---\n\n".join(context_chunks)
    system_prompt = f"""You are Nova, a PDF document assistant.

The user uploaded a PDF. Its extracted text is provided below in "Document Context".
You HAVE full access to this content — it has already been read and extracted for you.

RULES:
- ALWAYS answer using the Document Context below.
- NEVER say you cannot read, open, or access PDFs or documents.
- If the context is partial, answer with what is available and note what is missing.

Document Context:
{context_str}
"""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in filter_chat_history(history):
        role = "assistant" if msg.role == "bot" else "user"
        messages.append({"role": role, "content": msg.text or ""})
    return messages


@router.post("/pdf/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
):
    if PdfReader is None:
        raise HTTPException(status_code=500, detail="pypdf not installed. Run: pip install pypdf")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw_bytes = await file.read()
    record = await process_pdf_bytes(raw_bytes, file.filename)

    pdf_id = str(uuid.uuid4())
    PDF_STORE[pdf_id] = record

    storage_path = None
    if user_id:
        try:
            storage_path = upload_pdf_to_storage(user_id, pdf_id, raw_bytes)
            get_supabase().table("pdf_sessions").insert({
                "id": pdf_id,
                "user_id": user_id,
                "filename": file.filename,
                "pdf_id": pdf_id,
                "pages": record["pages"],
                "storage_path": storage_path,
            }).execute()
        except Exception as e:
            print(f"[Supabase] Failed to save pdf_session or storage: {e}")

    return {
        "pdf_id": pdf_id,
        "filename": file.filename,
        "pages": record["pages"],
        "chunks": len(record["chunks"]),
        "embedding_method": f"OpenRouter ({EMBED_MODEL})",
        "storage_path": storage_path,
    }


@router.post("/pdf/{pdf_id}/preload")
async def preload_pdf(pdf_id: str):
    """Load a PDF into memory from RAM or Supabase Storage (used after page refresh)."""
    await ensure_pdf_loaded(pdf_id)
    return {"status": "ok"}


@router.post("/pdf/chat")
async def pdf_chat(req: PDFChatRequest):
    if not OPENROUTER_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_KEY not set in .env")

    user_messages = [m for m in filter_chat_history(req.history) if m.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user question found in history.")

    latest_question = user_messages[-1].text or ""
    relevant_chunks, confidence = await retrieve_chunks(req.pdf_id, latest_question)

    if not relevant_chunks or not any(c.strip() for c in relevant_chunks):
        raise HTTPException(
            status_code=422,
            detail="Could not read content from this PDF. Try re-uploading the file.",
        )

    messages = build_rag_messages(relevant_chunks, req.history)

    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.3,
        "stream": True,
    }

    async def stream_response():
        yield f'data: {{"choices": [{{"delta": {{"content": "__CONF:{confidence}__"}}}}]}}\n\n'

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{OPENROUTER_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    err_str = error_text.decode("utf-8").replace('"', "'")
                    yield f'data: {{"choices": [{{"delta": {{"content": "⚠️ API Error {response.status_code}: {err_str}"}}}}]}}\n\n'
                    yield "data: [DONE]\n\n"
                    return

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:].strip()
                        if data == "[DONE]":
                            yield "data: [DONE]\n\n"
                            return
                        yield line + "\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")


@router.get("/pdf/{pdf_id}/file")
async def get_pdf_file(pdf_id: str):
    record = await ensure_pdf_loaded(pdf_id)
    filename = record.get("filename", "document.pdf")
    return Response(
        content=record["raw_bytes"],
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.delete("/pdf/{pdf_id}")
async def delete_pdf(pdf_id: str):
    PDF_STORE.pop(pdf_id, None)

    try:
        row = get_pdf_session_row(pdf_id)
        if row and row.get("storage_path"):
            get_supabase().storage.from_(PDF_BUCKET).remove([row["storage_path"]])
        get_supabase().table("pdf_sessions").delete().eq("id", pdf_id).execute()
    except Exception as e:
        print(f"[Supabase] Failed to delete pdf_session or storage: {e}")

    return {"status": "deleted"}

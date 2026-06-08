"""
PDF Chat Route — RAG with OpenRouter Embeddings + Confidence Scores
"""

import io
import os
import uuid
import httpx
import numpy as np

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

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

CHUNK_SIZE    = 500
CHUNK_OVERLAP = 100
TOP_K         = 5

PDF_STORE: dict[str, dict] = {}


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
    """Convert top cosine similarity score to High/Medium/Low label."""
    if score >= 0.75:
        return "high"
    elif score >= 0.45:
        return "medium"
    else:
        return "low"


async def retrieve_chunks(pdf_id: str, question: str) -> tuple[list[str], str]:
    """Returns (chunks, confidence_level)."""
    record = PDF_STORE.get(pdf_id)
    if not record:
        return [], "low"
    q_vec = (await embed_texts_api([question]))[0]
    scores = cosine_similarity(q_vec, record["embeddings"])
    indices = np.argsort(scores)[::-1][:TOP_K]
    top_score = float(scores[indices[0]])
    confidence = score_to_confidence(top_score)
    chunks = [record["chunks"][i] for i in indices]
    return chunks, confidence


def build_rag_messages(context_chunks: list[str], history: list[PDFChatMessage]) -> list[dict]:
    context_str = "\n\n---\n\n".join(context_chunks)
    system_prompt = f"""You are Nova, a helpful AI assistant. You answer questions about the uploaded PDF document.

Use the context below as your PRIMARY source — reference it when answering.
If the PDF context doesn't fully cover the question, supplement with your own knowledge and clearly say so.

Context from the PDF:
{context_str}
"""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        role = "assistant" if msg.role == "bot" else "user"
        messages.append({"role": role, "content": msg.text or ""})
    return messages


@router.post("/pdf/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if PdfReader is None:
        raise HTTPException(status_code=500, detail="pypdf not installed. Run: pip install pypdf")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw_bytes = await file.read()
    reader = PdfReader(io.BytesIO(raw_bytes))
    full_text = "".join((page.extract_text() or "") + "\n" for page in reader.pages)

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from this PDF (may be scanned/image-based).")

    chunks = chunk_text(full_text)
    embeddings = await embed_texts_api(chunks)

    pdf_id = str(uuid.uuid4())
    PDF_STORE[pdf_id] = {
        "chunks": chunks,
        "embeddings": embeddings,
        "filename": file.filename,
        "pages": len(reader.pages),
    }

    return {
        "pdf_id": pdf_id,
        "filename": file.filename,
        "pages": len(reader.pages),
        "chunks": len(chunks),
        "embedding_method": f"OpenRouter ({EMBED_MODEL})",
    }


@router.post("/pdf/chat")
async def pdf_chat(req: PDFChatRequest):
    if not OPENROUTER_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_KEY not set in .env")
    if req.pdf_id not in PDF_STORE:
        raise HTTPException(status_code=404, detail="PDF not found. Please re-upload.")

    user_messages = [m for m in req.history if m.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user question found in history.")

    latest_question = user_messages[-1].text or ""
    relevant_chunks, confidence = await retrieve_chunks(req.pdf_id, latest_question)
    messages = build_rag_messages(relevant_chunks, req.history)

    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.3,
        "stream": True,
    }

    async def stream_response():
        # Send confidence as very first chunk so frontend can pick it up
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


@router.delete("/pdf/{pdf_id}")
async def delete_pdf(pdf_id: str):
    PDF_STORE.pop(pdf_id, None)
    return {"status": "deleted"}
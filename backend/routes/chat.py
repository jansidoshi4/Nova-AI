import os
import httpx
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
from models import ChatRequest
from database import get_conn
from fastapi.responses import StreamingResponse

load_dotenv()

router = APIRouter()

OPENAI_KEY = os.getenv("OPENROUTER_KEY")
OPENAI_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_INSTRUCTION = """
You are an expert MySQL query generator.

Convert the user's request into a valid MySQL query.

Rules:
- Return ONLY SQL.
- No explanations.
- No markdown.
- No backticks.
- No comments.
- Use only the schema provided.
- If the request cannot be answered, return INVALID_QUERY.
"""


def build_openai_payload(history, schema=""):
    # Inject schema into system prompt if provided
    system_content = SYSTEM_INSTRUCTION
    if schema and schema.strip():
        system_content += f"\n\nDatabase Schema:\n{schema.strip()}"

    messages = [{"role": "system", "content": system_content}]

    for m in history:
        role = "assistant" if m.role == "bot" else "user"

        if m.image:
            content = [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{m.image_type or 'image/jpeg'};base64,{m.image}"
                    }
                },
                {"type": "text", "text": m.text or "What do you see in this image?"}
            ]
        else:
            content = m.text

        messages.append({"role": role, "content": content})

    return {
        "model": "google/gemini-3-flash-preview",
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.7,
    }

async def stream_openrouter(payload):
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            OPENAI_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_KEY}",
                "Content-Type": "application/json",
            },
            json={
                **payload,
                "stream": True,
            },
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    yield line + "\n"


@router.post("/chat")
async def chat(req: ChatRequest):
    if not OPENAI_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_KEY not set in backend .env")

    payload = build_openai_payload(req.history, req.schema or "")

    return StreamingResponse(
        stream_openrouter(payload),
        media_type="text/event-stream"
    )
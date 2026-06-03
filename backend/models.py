from pydantic import BaseModel
from typing import Optional


class Message(BaseModel):
    role: str           # 'user' or 'bot'
    text: Optional[str] = None
    image: Optional[str] = None       # base64 string
    image_type: Optional[str] = None  # e.g. 'image/jpeg'


class ChatRequest(BaseModel):
    session_id: str
    history: list[Message]  # full conversation so far
    schema: Optional[str] = ""  # user-pasted SQL schema

class ExplainSchemaRequest(BaseModel):
    schema: str


class SessionCreate(BaseModel):
    session_id: str
    title: Optional[str] = "New Chat"
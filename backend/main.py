from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routes.chat import router as chat_router
from routes.history import router as history_router
from routes.auth import router as auth_router
from routes.pdf_chat import router as pdf_router      # ← NEW

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Nova Chatbot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router,  prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(auth_router,  prefix="/api")
app.include_router(pdf_router,   prefix="/api")       # ← NEW
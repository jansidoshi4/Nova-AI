import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "chat.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us access columns by name
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id        TEXT PRIMARY KEY,
                title     TEXT NOT NULL DEFAULT 'New Chat',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS messages (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                role       TEXT NOT NULL CHECK(role IN ('user', 'bot')),
                text       TEXT,
                image      TEXT,
                image_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

from fastapi import APIRouter, HTTPException
from database import get_conn
from models import SessionCreate

router = APIRouter()


@router.get("/sessions")
def get_sessions():
    """Return all sessions ordered by most recent."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, title, created_at FROM sessions ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/sessions")
def create_session(body: SessionCreate):
    """Create a new session."""
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO sessions (id, title) VALUES (?, ?)",
            (body.session_id, body.title)
        )
    return {"session_id": body.session_id}


@router.get("/sessions/{session_id}/messages")
def get_messages(session_id: str):
    """Return all messages for a session."""
    with get_conn() as conn:
        session = conn.execute(
            "SELECT id FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        rows = conn.execute(
            "SELECT id, role, text, image, image_type, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC",
            (session_id,)
        ).fetchall()
    return [dict(r) for r in rows]


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    """Delete a session and all its messages."""
    with get_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    return {"deleted": session_id}

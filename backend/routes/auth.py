import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    credential: str

@router.post("/auth/google")
def google_auth(body: GoogleAuthRequest):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not set in backend .env")

    try:
        info = id_token.verify_oauth2_token(
            body.credential,
            requests.Request(),
            client_id
        )

        return {
            "id": f"google:{info['sub']}",
            "name": info.get("name") or info.get("email", "Google User"),
            "email": info.get("email"),
            "picture": info.get("picture"),
            "provider": "google",
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

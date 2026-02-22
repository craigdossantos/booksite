"""FastAPI service for book processing on Railway."""

import hashlib
import hmac
import os

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel

from process_book import process_book

app = FastAPI(title="Book Processing Service")

WEBHOOK_SECRET = os.environ.get("RAILWAY_WEBHOOK_SECRET", "")


class ProcessRequest(BaseModel):
    book_id: str


def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify HMAC-SHA256 webhook signature."""
    if not WEBHOOK_SECRET:
        return False
    expected = hmac.new(
        WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/process", status_code=202)
async def process_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_webhook_signature: str = Header(...),
):
    """Receive a processing webhook from Vercel. Returns 202 immediately."""
    body = await request.body()

    if not verify_signature(body, x_webhook_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = ProcessRequest.model_validate_json(body)
    background_tasks.add_task(process_book, data.book_id)

    return {"status": "accepted", "book_id": data.book_id}

import os
from urllib.parse import quote_plus

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.pdf import Pdf
from app.models.subject import Subject
from app.models.user import User
from app.schemas.ai import ExplainExample, ExplainOut, PdfExplainIn, RelatedLink, TopicExplainIn
from app.services import ollama
from app.services.pdf_text import extract_pdf_excerpt

router = APIRouter(prefix="/ai", tags=["ai"])


def _require_ai_enabled() -> None:
    if not settings.ai_features_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are not available in this environment.",
        )


@router.get("/status")
async def ai_status():
    return {"enabled": settings.ai_features_enabled}


def _related_links(topics: list) -> list[RelatedLink]:
    links: list[RelatedLink] = []
    for t in topics[:5]:
        if not isinstance(t, str) or not t.strip():
            continue
        query = quote_plus(t.strip())
        links.append(RelatedLink(label=f"Search: {t.strip()}", url=f"https://duckduckgo.com/?q={query}"))
    return links


def _to_out(outcome: dict) -> ExplainOut:
    if outcome["error"] or not outcome["data"]:
        return ExplainOut(error=outcome["error"] or "No explanation was generated.")
    data = outcome["data"]
    examples = [
        ExplainExample(title=str(e.get("title", "")), explanation=str(e.get("explanation", "")))
        for e in data.get("examples", [])
        if isinstance(e, dict)
    ]
    return ExplainOut(
        title=str(data.get("title", "")),
        story=str(data.get("story", "")),
        examples=examples,
        related_links=_related_links(data.get("related_topics", [])),
        error=None,
    )


@router.post("/explain-topic", response_model=ExplainOut)
async def explain_topic_endpoint(
    payload: TopicExplainIn, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    _require_ai_enabled()
    subject = await db.get(Subject, payload.subject_id)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    if not payload.topic.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a topic to explain")

    try:
        async with ollama.ollama_slot():
            outcome = await ollama.explain_topic(subject.name, payload.topic.strip())
    except ollama.OllamaBusy:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="The AI model is busy with another request right now. Try again shortly.",
        )
    return _to_out(outcome)


@router.post("/explain-pdf", response_model=ExplainOut)
async def explain_pdf_endpoint(
    payload: PdfExplainIn, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    _require_ai_enabled()
    pdf = await db.get(Pdf, payload.pdf_id)
    if pdf is None or not os.path.exists(pdf.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF not found")

    subject = await db.get(Subject, pdf.subject_id)
    try:
        excerpt = extract_pdf_excerpt(pdf.file_path)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not read this PDF's text")
    if not excerpt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This PDF has no extractable text (likely scanned images)"
        )

    try:
        async with ollama.ollama_slot():
            outcome = await ollama.explain_pdf(subject.name if subject else "", pdf.title, excerpt)
    except ollama.OllamaBusy:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="The AI model is busy with another request right now. Try again shortly.",
        )
    return _to_out(outcome)

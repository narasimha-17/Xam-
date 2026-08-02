import os
import re
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.pdf import Pdf
from app.models.subject import Subject, Topic
from app.models.user import User
from app.schemas.pdf import PdfOut

router = APIRouter(prefix="/pdfs", tags=["pdfs"])

MAX_PDF_SIZE = 25 * 1024 * 1024  # 25 MB


def _safe_filename(title: str) -> str:
    cleaned = re.sub(r"[^\w\-. ]", "_", title).strip() or "document"
    return cleaned if cleaned.lower().endswith(".pdf") else f"{cleaned}.pdf"


@router.post("", response_model=PdfOut, status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    subject_id: int = Form(...),
    topic_id: int | None = Form(None),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")

    subject = await db.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    if topic_id is not None:
        topic = await db.get(Topic, topic_id)
        if topic is None or topic.subject_id != subject_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid topic for this subject")

    contents = await file.read()
    if len(contents) > MAX_PDF_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds 25MB limit")

    os.makedirs(settings.upload_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}.pdf"
    file_path = os.path.join(settings.upload_dir, stored_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    pdf = Pdf(subject_id=subject_id, topic_id=topic_id, title=title, file_path=file_path, uploaded_by=admin.id)
    db.add(pdf)
    await db.commit()
    await db.refresh(pdf)
    return pdf


@router.get("", response_model=list[PdfOut])
async def list_pdfs(
    subject_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Pdf).order_by(Pdf.uploaded_at.desc())
    if subject_id is not None:
        query = query.where(Pdf.subject_id == subject_id)
    result = await db.scalars(query)
    return result.all()


@router.get("/{pdf_id}/download")
async def download_pdf(pdf_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    pdf = await db.get(Pdf, pdf_id)
    if pdf is None or not os.path.exists(pdf.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF not found")
    return FileResponse(pdf.file_path, media_type="application/pdf", filename=_safe_filename(pdf.title))


@router.delete("/{pdf_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pdf(pdf_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    pdf = await db.get(Pdf, pdf_id)
    if pdf is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF not found")
    if os.path.exists(pdf.file_path):
        os.remove(pdf.file_path)
    await db.delete(pdf)
    await db.commit()

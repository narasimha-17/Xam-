from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.coding import CodingProblem
from app.models.company import Company, CompanyAptitudeQuestion, CompanySubscription, CompanyTechnicalQuestion
from app.models.user import User, UserRole
from app.schemas.company import (
    CompanyAptitudeAdminOut,
    CompanyAptitudeAttemptIn,
    CompanyAptitudeAttemptResult,
    CompanyAptitudeIn,
    CompanyAptitudeOut,
    CompanyCodingOut,
    CompanyIn,
    CompanyOut,
    CompanyTechnicalIn,
    CompanyTechnicalOut,
)

router = APIRouter(prefix="/companies", tags=["companies"])


async def _is_subscribed(db: AsyncSession, user_id: int, company_id: int) -> bool:
    existing = await db.scalar(
        select(CompanySubscription).where(
            CompanySubscription.user_id == user_id, CompanySubscription.company_id == company_id
        )
    )
    return existing is not None


async def _company_out(db: AsyncSession, company: Company, user: User) -> CompanyOut:
    coding_count = len((await db.scalars(select(CodingProblem.id).where(CodingProblem.company_id == company.id))).all())
    aptitude_count = len(
        (await db.scalars(select(CompanyAptitudeQuestion.id).where(CompanyAptitudeQuestion.company_id == company.id))).all()
    )
    technical_count = len(
        (await db.scalars(select(CompanyTechnicalQuestion.id).where(CompanyTechnicalQuestion.company_id == company.id))).all()
    )
    return CompanyOut(
        id=company.id,
        name=company.name,
        description=company.description,
        is_active=company.is_active,
        created_at=company.created_at,
        coding_count=coding_count,
        aptitude_count=aptitude_count,
        technical_count=technical_count,
        is_subscribed=await _is_subscribed(db, user.id, company.id),
    )


@router.get("", response_model=list[CompanyOut])
async def list_companies(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    query = select(Company).order_by(Company.name.asc())
    if user.role != UserRole.admin:
        query = query.where(Company.is_active.is_(True))
    result = await db.scalars(query)
    return [await _company_out(db, c, user) for c in result.all()]


@router.get("/{company_id}", response_model=CompanyOut)
async def get_company(company_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    company = await db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return await _company_out(db, company, user)


@router.post("/{company_id}/subscribe", response_model=CompanyOut)
async def subscribe(company_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    company = await db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    if not await _is_subscribed(db, user.id, company_id):
        db.add(CompanySubscription(user_id=user.id, company_id=company_id))
        await db.commit()
    return await _company_out(db, company, user)


@router.delete("/{company_id}/subscribe", response_model=CompanyOut)
async def unsubscribe(company_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    company = await db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    existing = await db.scalar(
        select(CompanySubscription).where(
            CompanySubscription.user_id == user.id, CompanySubscription.company_id == company_id
        )
    )
    if existing is not None:
        await db.delete(existing)
        await db.commit()
    return await _company_out(db, company, user)


@router.get("/{company_id}/aptitude", response_model=list[CompanyAptitudeOut])
async def list_aptitude(
    company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.scalars(
        select(CompanyAptitudeQuestion)
        .where(CompanyAptitudeQuestion.company_id == company_id)
        .order_by(CompanyAptitudeQuestion.order.asc())
    )
    return result.all()


@router.post("/aptitude/{question_id}/attempt", response_model=CompanyAptitudeAttemptResult)
async def attempt_aptitude(
    question_id: int,
    payload: CompanyAptitudeAttemptIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    question = await db.get(CompanyAptitudeQuestion, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    if not 0 <= payload.selected_index < len(question.options):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid option index")
    return CompanyAptitudeAttemptResult(
        is_correct=payload.selected_index == question.correct_index,
        correct_index=question.correct_index,
        explanation=question.explanation,
    )


@router.get("/{company_id}/technical", response_model=list[CompanyTechnicalOut])
async def list_technical(
    company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.scalars(
        select(CompanyTechnicalQuestion)
        .where(CompanyTechnicalQuestion.company_id == company_id)
        .order_by(CompanyTechnicalQuestion.order.asc())
    )
    return result.all()


@router.get("/{company_id}/coding", response_model=list[CompanyCodingOut])
async def list_coding(
    company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.scalars(
        select(CodingProblem).where(CodingProblem.company_id == company_id, CodingProblem.is_published.is_(True))
    )
    return result.all()


# ---------- Admin ----------


@router.post("/admin", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
async def create_company(payload: CompanyIn, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    existing = await db.scalar(select(Company).where(Company.name == payload.name))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A company with this name already exists")
    company = Company(name=payload.name, description=payload.description, created_by=admin.id)
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return await _company_out(db, company, admin)


@router.patch("/admin/{company_id}", response_model=CompanyOut)
async def update_company(
    company_id: int, payload: CompanyIn, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)
):
    company = await db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    company.name = payload.name
    company.description = payload.description
    await db.commit()
    return await _company_out(db, company, admin)


@router.patch("/admin/{company_id}/toggle-active", response_model=CompanyOut)
async def toggle_company_active(
    company_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)
):
    company = await db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    company.is_active = not company.is_active
    await db.commit()
    return await _company_out(db, company, admin)


@router.delete("/admin/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    company = await db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    await db.delete(company)
    await db.commit()


@router.post("/admin/{company_id}/aptitude", response_model=CompanyAptitudeAdminOut, status_code=status.HTTP_201_CREATED)
async def create_aptitude_question(
    company_id: int, payload: CompanyAptitudeIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    if not 0 <= payload.correct_index < len(payload.options):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="correct_index out of range")
    question = CompanyAptitudeQuestion(company_id=company_id, **payload.model_dump())
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.patch("/admin/aptitude/{question_id}", response_model=CompanyAptitudeAdminOut)
async def update_aptitude_question(
    question_id: int, payload: CompanyAptitudeIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    question = await db.get(CompanyAptitudeQuestion, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    if not 0 <= payload.correct_index < len(payload.options):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="correct_index out of range")
    for field, value in payload.model_dump().items():
        setattr(question, field, value)
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/admin/aptitude/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_aptitude_question(question_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    question = await db.get(CompanyAptitudeQuestion, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    await db.delete(question)
    await db.commit()


@router.post("/admin/{company_id}/technical", response_model=CompanyTechnicalOut, status_code=status.HTTP_201_CREATED)
async def create_technical_question(
    company_id: int, payload: CompanyTechnicalIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    question = CompanyTechnicalQuestion(company_id=company_id, **payload.model_dump())
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.patch("/admin/technical/{question_id}", response_model=CompanyTechnicalOut)
async def update_technical_question(
    question_id: int, payload: CompanyTechnicalIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    question = await db.get(CompanyTechnicalQuestion, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    for field, value in payload.model_dump().items():
        setattr(question, field, value)
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/admin/technical/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_technical_question(question_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    question = await db.get(CompanyTechnicalQuestion, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    await db.delete(question)
    await db.commit()

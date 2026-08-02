import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.coding import CodingProblem, CodingSubmission, CodingTestCase
from app.models.user import User
from app.schemas.coding import (
    CodingProblemAdminOut,
    CodingProblemDetailOut,
    CodingProblemIn,
    CodingProblemListItemOut,
    CodingSubmissionOut,
    RunCodeIn,
    RunCodeResultOut,
    SampleTestCaseOut,
    SubmitResultOut,
    TestCaseRunResultOut,
)
from app.services import judge0

router = APIRouter(prefix="/coding-problems", tags=["coding-problems"])


@router.get("/status")
async def coding_status():
    return {"enabled": bool(settings.judge0_url)}


async def _get_problem_or_404(problem_id: int, db: AsyncSession, *, require_published: bool) -> CodingProblem:
    problem = await db.get(CodingProblem, problem_id, options=[selectinload(CodingProblem.test_cases)])
    if problem is None or (require_published and not problem.is_published):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")
    return problem


async def _solved_problem_ids(db: AsyncSession, user_id: int) -> set[int]:
    result = await db.scalars(
        select(CodingSubmission.problem_id).where(
            CodingSubmission.user_id == user_id, CodingSubmission.is_solved.is_(True)
        )
    )
    return set(result.all())


@router.get("", response_model=list[CodingProblemListItemOut])
async def list_problems(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    query = select(CodingProblem)
    if user.role.value != "admin":
        query = query.where(CodingProblem.is_published.is_(True))
    result = await db.scalars(query.order_by(CodingProblem.id.asc()))
    problems = result.all()
    solved = await _solved_problem_ids(db, user.id)
    return [
        CodingProblemListItemOut(
            id=p.id,
            title=p.title,
            difficulty=p.difficulty,
            tags=p.tags,
            languages=p.languages,
            is_solved=p.id in solved,
        )
        for p in problems
    ]


@router.get("/{problem_id}", response_model=CodingProblemDetailOut)
async def get_problem(
    problem_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    problem = await _get_problem_or_404(problem_id, db, require_published=user.role.value != "admin")
    solved = await _solved_problem_ids(db, user.id)
    samples = [tc for tc in problem.test_cases if tc.is_sample]
    hidden_count = len(problem.test_cases) - len(samples)
    return CodingProblemDetailOut(
        id=problem.id,
        title=problem.title,
        description=problem.description,
        difficulty=problem.difficulty,
        tags=problem.tags,
        languages=problem.languages,
        starter_code=problem.starter_code,
        sample_test_cases=[
            SampleTestCaseOut(id=tc.id, input=tc.input, expected_output=tc.expected_output) for tc in samples
        ],
        hidden_test_case_count=hidden_count,
        is_solved=problem.id in solved,
    )


@router.get("/{problem_id}/submissions", response_model=list[CodingSubmissionOut])
async def list_my_submissions(
    problem_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    result = await db.scalars(
        select(CodingSubmission)
        .where(CodingSubmission.problem_id == problem_id, CodingSubmission.user_id == user.id)
        .order_by(CodingSubmission.submitted_at.desc())
    )
    return result.all()


@router.post("/{problem_id}/run", response_model=RunCodeResultOut)
async def run_against_samples(
    problem_id: int,
    payload: RunCodeIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Ungraded trial run against this problem's sample test cases only."""
    problem = await _get_problem_or_404(problem_id, db, require_published=user.role.value != "admin")
    if problem.languages and payload.language not in problem.languages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Language not enabled for this problem")

    samples = [tc for tc in problem.test_cases if tc.is_sample]
    if not samples:
        return RunCodeResultOut(test_case_results=[], passed_count=0, total_count=0)

    outcomes = await asyncio.gather(*(judge0.run_code(payload.language, payload.code, tc.input) for tc in samples))
    results = []
    passed_count = 0
    for tc, outcome in zip(samples, outcomes):
        actual = outcome["stdout"].strip()
        passed = outcome["error"] is None and actual == tc.expected_output.strip()
        passed_count += passed
        results.append(
            TestCaseRunResultOut(
                input=tc.input,
                expected_output=tc.expected_output,
                actual_output=outcome["stdout"],
                passed=passed,
                error=outcome["error"],
            )
        )
    return RunCodeResultOut(test_case_results=results, passed_count=passed_count, total_count=len(samples))


@router.post("/{problem_id}/submit", response_model=SubmitResultOut)
async def submit_solution(
    problem_id: int,
    payload: RunCodeIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    problem = await _get_problem_or_404(problem_id, db, require_published=user.role.value != "admin")
    if problem.languages and payload.language not in problem.languages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Language not enabled for this problem")
    if not problem.test_cases:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This problem has no test cases yet")

    outcomes = await asyncio.gather(
        *(judge0.run_code(payload.language, payload.code, tc.input) for tc in problem.test_cases)
    )
    results = []
    passed_count = 0
    for tc, outcome in zip(problem.test_cases, outcomes):
        actual = outcome["stdout"].strip()
        passed = outcome["error"] is None and actual == tc.expected_output.strip()
        passed_count += passed
        # Hidden test cases: reveal pass/fail only, never their input/expected/actual content.
        if tc.is_sample:
            results.append(
                TestCaseRunResultOut(
                    input=tc.input,
                    expected_output=tc.expected_output,
                    actual_output=outcome["stdout"],
                    passed=passed,
                    error=outcome["error"],
                )
            )
        else:
            results.append(
                TestCaseRunResultOut(input="", expected_output="", actual_output="", passed=passed, error=None)
            )

    total = len(problem.test_cases)
    is_solved = passed_count == total
    submission = CodingSubmission(
        user_id=user.id,
        problem_id=problem.id,
        language=payload.language,
        code=payload.code,
        passed_count=passed_count,
        total_count=total,
        is_solved=is_solved,
    )
    db.add(submission)
    await db.commit()

    return SubmitResultOut(
        is_solved=is_solved, passed_count=passed_count, total_count=total, test_case_results=results
    )


# ---------- Admin CRUD ----------


@router.get("/admin/all", response_model=list[CodingProblemAdminOut])
async def admin_list_problems(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.scalars(
        select(CodingProblem).options(selectinload(CodingProblem.test_cases)).order_by(CodingProblem.id.desc())
    )
    return result.all()


@router.post("/admin", response_model=CodingProblemAdminOut, status_code=status.HTTP_201_CREATED)
async def create_problem(
    payload: CodingProblemIn, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)
):
    problem = CodingProblem(
        title=payload.title,
        description=payload.description,
        difficulty=payload.difficulty,
        tags=payload.tags,
        languages=payload.languages,
        starter_code=payload.starter_code,
        is_published=payload.is_published,
        created_by=admin.id,
        test_cases=[
            CodingTestCase(
                input=tc.input, expected_output=tc.expected_output, is_sample=tc.is_sample, order=i
            )
            for i, tc in enumerate(payload.test_cases)
        ],
    )
    db.add(problem)
    await db.commit()
    await db.refresh(problem, attribute_names=["test_cases"])
    return problem


@router.patch("/admin/{problem_id}", response_model=CodingProblemAdminOut)
async def update_problem(
    problem_id: int,
    payload: CodingProblemIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    problem = await db.get(CodingProblem, problem_id, options=[selectinload(CodingProblem.test_cases)])
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")

    problem.title = payload.title
    problem.description = payload.description
    problem.difficulty = payload.difficulty
    problem.tags = payload.tags
    problem.languages = payload.languages
    problem.starter_code = payload.starter_code
    problem.is_published = payload.is_published
    problem.test_cases = [
        CodingTestCase(input=tc.input, expected_output=tc.expected_output, is_sample=tc.is_sample, order=i)
        for i, tc in enumerate(payload.test_cases)
    ]
    await db.commit()
    await db.refresh(problem, attribute_names=["test_cases"])
    return problem


@router.delete("/admin/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(problem_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    problem = await db.get(CodingProblem, problem_id)
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")
    await db.delete(problem)
    await db.commit()

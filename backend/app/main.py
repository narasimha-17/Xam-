import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.routers import (
    admin,
    ai,
    ai_radar,
    auth,
    coding,
    companies,
    competitions,
    courses,
    discussions,
    docker_learn,
    exams,
    feedback,
    git_learn,
    jobs,
    k8s_learn,
    notifications,
    os_learn,
    pdfs,
    proctoring,
    progress,
    puzzles,
    resume,
    sql_learn,
    study_events,
    subjects,
    users,
)
from app.services.ai_radar import run_ai_radar_pipeline

os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.discussion_image_dir, exist_ok=True)
os.makedirs(settings.feedback_image_dir, exist_ok=True)

app = FastAPI(title="Engineering Practice LMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(pdfs.router)
app.include_router(exams.router)
app.include_router(discussions.router)
app.include_router(progress.router)
app.include_router(proctoring.router)
app.include_router(ai.router)
app.include_router(users.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(puzzles.router)
app.include_router(coding.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(competitions.router)
app.include_router(git_learn.router)
app.include_router(docker_learn.router)
app.include_router(sql_learn.router)
app.include_router(k8s_learn.router)
app.include_router(os_learn.router)
app.include_router(study_events.router)
app.include_router(ai_radar.router)
app.include_router(courses.router)
app.include_router(resume.router)
app.include_router(feedback.router)

scheduler = AsyncIOScheduler()


async def _run_ai_radar_job() -> None:
    async with AsyncSessionLocal() as db:
        await run_ai_radar_pipeline(db)


@app.on_event("startup")
async def _start_scheduler():
    if settings.ai_features_enabled:
        scheduler.add_job(_run_ai_radar_job, "cron", hour=6, minute=0, id="ai_radar_daily", misfire_grace_time=3600)
        scheduler.start()


@app.on_event("shutdown")
async def _stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()


@app.get("/health")
async def health():
    return {"status": "ok"}

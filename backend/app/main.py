import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    admin,
    ai,
    auth,
    coding,
    competitions,
    discussions,
    docker_learn,
    exams,
    git_learn,
    jobs,
    k8s_learn,
    notifications,
    os_learn,
    pdfs,
    proctoring,
    progress,
    puzzles,
    sql_learn,
    subjects,
    users,
)

os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.discussion_image_dir, exist_ok=True)

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
app.include_router(jobs.router)
app.include_router(competitions.router)
app.include_router(git_learn.router)
app.include_router(docker_learn.router)
app.include_router(sql_learn.router)
app.include_router(k8s_learn.router)
app.include_router(os_learn.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

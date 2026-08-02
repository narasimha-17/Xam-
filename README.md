# Xam+ 

Engineering practice platform — practice exams (MCQ, MAQ, match-the-following, fill-in-the-blank), a PDF study library, discussion threads, and progress tracking. Two roles: **admin/instructor** (manages content) and **student** (practices).

## Stack
- **Backend**: FastAPI, SQLAlchemy (async), PostgreSQL, Alembic, JWT auth
- **Frontend**: React + TypeScript (Vite), Tailwind CSS, React Router, React Query, Framer Motion

## Local development

### Backend
```
cd backend
python -m venv .venv
./.venv/Scripts/activate        # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env             # adjust DATABASE_URL/SYNC_DATABASE_URL for your Postgres
alembic upgrade head
python -m app.seed_admin         # creates the initial admin user (see .env for credentials)
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

### Frontend
```
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

### Docker (alternative)
```
docker compose up
```
Brings up Postgres, the backend, and the frontend together.

## Default admin login
Set in `backend/.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`), created by `python -m app.seed_admin`.

## Deploying (Render)

This repo includes a `render.yaml` blueprint that provisions everything: a managed Postgres
database, the FastAPI backend (as a Docker web service), and the React frontend (as a static
site). It runs Alembic migrations and seeds the admin user automatically on every deploy.

1. **Push this repo to GitHub** (see "First push" below if you haven't already).
2. In the [Render dashboard](https://dashboard.render.com), click **New > Blueprint** and point it
   at your GitHub repo. Render will read `render.yaml` and create all three resources
   (`xamplus-db`, `xamplus-backend`, `xamplus-frontend`).
3. Let the first deploy finish for both services, then wire them together (Vite bakes
   `VITE_API_URL` in at build time, so this can't be known ahead of the first deploy):
   - On **xamplus-backend** → Environment: set `CORS_ORIGINS` and `FRONTEND_URL` to your
     frontend's URL (e.g. `https://xamplus-frontend.onrender.com`), then save (no rebuild needed).
   - On **xamplus-frontend** → Environment: set `VITE_API_URL` to your backend's URL
     (e.g. `https://xamplus-backend.onrender.com`), then trigger **Manual Deploy** to rebuild.
4. Get the auto-generated admin password from **xamplus-backend** → Environment →
   `SEED_ADMIN_PASSWORD`, and sign in with `SEED_ADMIN_EMAIL`.

### Known limitations in this deployment
- **AI features are off by default** (`AI_FEATURES_ENABLED=false` in `render.yaml`) — AI question
  generation and the topic/PDF explainer both call a local Ollama model that only exists on your
  dev machine. In the UI these show as "Coming soon" rather than erroring. To enable them in a
  real deployment, you'd point `OLLAMA_HOST` at a hosted Ollama instance (or swap the calls in
  `app/services/ollama.py` for a hosted LLM API) and flip the flag back to `true`.
- **Coding-question execution** (JDoodle) needs real `JDOODLE_CLIENT_ID` /
  `JDOODLE_CLIENT_SECRET` values — left blank by default, so "Run code" will fail on the deployed
  instance until you add credentials from [jdoodle.com](https://www.jdoodle.com/compiler-api).
- **Uploaded PDFs** live on a 1GB persistent disk attached to the backend service — fine for a
  demo, but not redundant/backed-up storage.

### First push
This project directory has its own git history, separate from anything else on your machine:
```
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

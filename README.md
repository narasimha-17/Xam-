# Xam+ 

Engineering practice platform — practice exams (MCQ, MAQ, match-the-following, fill-in-the-blank), a PDF study library, discussion threads, and progress tracking. Two roles: **admin/instructor** (manages content) and **student** (practices).

## Stack
- **Backend**: FastAPI, SQLAlchemy (async), PostgreSQL (hosted on [Neon](https://neon.tech)), Alembic,
  Firebase Authentication (email/password + Google)
- **Frontend**: React + TypeScript (Vite), Tailwind CSS, React Router, React Query, Framer Motion

## Auth & database setup (do this first)
Login is handled entirely by **Firebase Authentication** — the backend never sees a password, it
only verifies Firebase ID tokens. The database is a plain Postgres instance on **Neon** (Render's
own free Postgres expires/suspends after 30 days, which is why this isn't on Render).

1. **Neon**: create a free project at [neon.tech](https://neon.tech) and copy its connection
   string (`postgres://user:pass@host/dbname?sslmode=require`) — use it for both
   `DATABASE_URL`/`SYNC_DATABASE_URL` below.
2. **Firebase**: create a project at the [Firebase Console](https://console.firebase.google.com):
   - **Authentication → Sign-in method**: enable **Google** and **Email/Password**.
   - **Project settings → General → Your apps**: add a **Web app**, copy its config
     (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) into
     `frontend/.env`'s `VITE_FIREBASE_*` vars.
   - **Project settings → Service accounts**: **Generate new private key** (downloads a JSON
     file). Minify it to one line and set it as `backend/.env`'s `FIREBASE_SERVICE_ACCOUNT_JSON`.
3. Whoever signs in (Google or email/password) with the email in `SEED_ADMIN_EMAIL` becomes admin
   automatically on first login — see `python -m app.seed_admin` below.

## Local development

### Backend
```
cd backend
python -m venv .venv
./.venv/Scripts/activate        # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env             # fill in DATABASE_URL/SYNC_DATABASE_URL (Neon) and FIREBASE_SERVICE_ACCOUNT_JSON
alembic upgrade head
python -m app.seed_admin         # pre-seeds SEED_ADMIN_EMAIL as admin, claimed on its first real login
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

### Frontend
```
cd frontend
npm install
# fill in VITE_FIREBASE_* in .env (see "Auth & database setup" above)
npm run dev
```
App: http://localhost:5173

### Docker (alternative)
```
docker compose up
```
Brings up Postgres, the backend, and the frontend together. (You can still point `DATABASE_URL`
at Neon instead of the local `db` service if you'd rather share data with your Render deployment.)

## Default admin login
Set `SEED_ADMIN_EMAIL` in `backend/.env` / `render.yaml`, seeded by `python -m app.seed_admin`.
There's no password to set — sign in with that exact email via Firebase (Google or
email/password) and it becomes admin automatically.

## Deploying (Render)

This repo includes a `render.yaml` blueprint for the backend (FastAPI, as a native Python web
service — no Docker, so no payment verification required) and the React frontend (as a static
site). The database and auth are external (Neon + Firebase, see above), so `render.yaml` no
longer provisions a Render-managed Postgres.

1. **Push this repo to GitHub** (see "First push" below if you haven't already).
2. In the [Render dashboard](https://dashboard.render.com), click **New > Blueprint** and point it
   at your GitHub repo. Render will read `render.yaml` and create both resources
   (`xamplus-backend`, `xamplus-frontend`).
3. On **xamplus-backend** → Environment, set manually (all marked `sync: false` in `render.yaml`):
   - `DATABASE_URL` / `SYNC_DATABASE_URL` — your Neon connection string.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — the service account JSON (one line).
   - `CORS_ORIGINS` / `FRONTEND_URL` — your frontend's URL, once you know it (see step 4).
4. On **xamplus-frontend** → Environment, set: `VITE_API_URL` (your backend's URL) and the six
   `VITE_FIREBASE_*` vars — then trigger **Manual Deploy** (Vite bakes these in at build time, so
   changing them always needs a rebuild).
5. Redeploy **xamplus-backend** once its env vars are set — this runs `alembic upgrade head`
   against Neon and seeds the admin placeholder.

### Known limitations in this deployment
- **AI features are off by default** (`AI_FEATURES_ENABLED=false` in `render.yaml`) — AI question
  generation and the topic/PDF explainer both call a local Ollama model that only exists on your
  dev machine. In the UI these show as "Coming soon" rather than erroring. To enable them in a
  real deployment, you'd point `OLLAMA_HOST` at a hosted Ollama instance (or swap the calls in
  `app/services/ollama.py` for a hosted LLM API) and flip the flag back to `true`.
- **Coding-question execution** (JDoodle) needs real `JDOODLE_CLIENT_ID` /
  `JDOODLE_CLIENT_SECRET` values — left blank by default, so "Run code" will fail on the deployed
  instance until you add credentials from [jdoodle.com](https://www.jdoodle.com/compiler-api).
- **Uploaded files need a paid plan to persist.** `render.yaml` mounts a 1GB disk on the backend
  service at `/var/data` (`UPLOAD_DIR`/`DISCUSSION_IMAGE_DIR` point PDFs and Xipe Community images
  at it) so they survive restarts/redeploys — but Render disks require the `starter` plan or above,
  which is why the backend's `plan` was bumped up from `free`. If you drop back to the free plan,
  remove the `disk:` block and those two env var overrides, and uploaded files will go back to
  being wiped on every redeploy.

### First push
This project directory has its own git history, separate from anything else on your machine:
```
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

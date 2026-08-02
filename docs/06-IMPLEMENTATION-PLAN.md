# Document 06 — Implementation Plan (Step-by-Step Build Sequence)

This reflects the order Xam+ was actually built and verified in, not a hypothetical plan.

## Phase 1: Setup
Scaffold `backend/` (FastAPI app structure: `core/`, `db/`, `models/`, `schemas/`, `routers/`, `services/`) and `frontend/` (Vite + React + TS). Stand up PostgreSQL (native local install used in place of Docker, since Docker Desktop's engine wasn't running — `docker-compose.yml` kept for later/deployment). Define all SQLAlchemy models up front (full schema across every domain) and generate the single initial Alembic migration from them, so later phases only add routers/schemas, not further migrations. Implement JWT auth (register/login/me), the `get_current_user` / `require_admin` dependencies, and a `seed_admin.py` script for the first admin user.
**Done criteria**: `alembic upgrade head` runs clean; register → login → `/auth/me` verified end-to-end via curl; both dev servers boot with no errors.

## Phase 2: Subjects + PDF Library
Backend: CRUD for subjects/topics, PDF upload (multipart, content-type + size validated) and authenticated download endpoint. Frontend: Subjects catalog page, Subject detail page, admin "New subject" modal and "Upload PDF" modal, PDF open-in-new-tab via authenticated blob fetch (not a raw URL, to avoid putting the JWT in a query string).
**Done criteria**: admin can create a subject and upload a PDF; any authenticated user can browse subjects and open a PDF.

## Phase 3: Exams
The largest phase. Backend: models for all 4 question types (already scaffolded in Phase 1), a `services/grading.py` module implementing exact-match (MCQ), all-or-nothing (MAQ), and partial-credit (match, fill-blank) scoring, and the full exam lifecycle — create (nested questions), publish/unpublish, start attempt, submit (grades + persists), fetch attempt/result. The student-facing exam schema deliberately withholds correct answers and shuffles match-question right-column display order. Frontend: an admin exam builder (dynamic nested form via `react-hook-form`'s `useFieldArray`, question-type switcher), a timed exam-taking flow with a question-status palette and autosubmit on timeout, and a results page with a score ring, stat tiles, and a per-question "your answer vs. correct answer" breakdown.
**Done criteria**: verified via direct API calls that grading math is exactly right for all 4 types on a mixed-answer submission (3/6 points across one right, one wrong, one partial-match, one right fill-blank); then re-verified live in a headless browser (Playwright) — admin creates/publishes an exam, student takes all 4 question types, submits, and sees a correct results breakdown, with zero console errors.

## Phase 4: Discussion
Backend: thread creation (atomically creates the thread + its opening post), reply posting, delete (author-or-admin only) for both threads and posts, author names resolved via an ORM relationship rather than a second query. Frontend: a subject-picker page, a per-subject thread list with a "New thread" modal, and a thread-detail page with a flat reply list and reply box.
**Done criteria**: browser-verified — created a thread as one user, replied as another, both posts render with correct author names in chronological order.

## Phase 5: Progress Tracking
Backend: a single `GET /progress/me` endpoint that aggregates directly from `exam_attempts`/`attempt_answers` (joined through `exams` to `subjects`) — no new stored table, so there's nothing to keep in sync. Frontend: a Progress page (total attempts, average score, per-subject score bars color-coded by threshold) and real numbers wired into the Dashboard's stat tiles (previously placeholder "—" values).
**Done criteria**: browser-verified the dashboard and progress page show real, correct numbers matching actual attempt history.

## Phase 6: Coding Questions (LeetCode-style)
Added after the initial build, as its own feature. The execution-service decision took two attempts: the original plan (Piston's public API) turned out to require manual whitelist approval as of Feb 2026, discovered only by actually test-calling it; self-hosting Piston/Judge0 via Docker was the fallback but Docker Desktop's engine wasn't running locally. Landed on **JDoodle's Compiler API** (free tier, ~200 executions/day) instead.

Backend: a new `test_cases` table (stdin/expected-stdout pairs per question, each flagged `is_sample` or hidden), two new `questions` columns (`languages`, `starter_code` JSON keyed by language), an async `services/jdoodle.py` client (never raises — network/compile/runtime failures all surface as a per-test-case `error` string), and `services/grading.py` extended with an async `_grade_coding` that runs all of a question's test cases concurrently (`asyncio.gather`) and awards partial credit by fraction passed. A new `POST /exams/questions/{id}/run` endpoint lets a student trial-run code against only the *sample* test cases (ungraded, hidden cases never exposed) before submitting — mirroring LeetCode's Run-vs-Submit split. The full per-test-case grading detail is persisted to a new `attempt_answers.graded_detail` column at submit time, so revisiting a results page never re-hits JDoodle (and never burns its daily quota) — this required also refactoring `grade_answer`/`grade_attempt` from sync to async throughout, since coding grading needs to await HTTP calls.

Frontend: the admin exam builder gained a "coding" question type — language checkboxes (Python/Java/C++) that auto-fill a starter skeleton per language on first check, a starter-code textarea per enabled language, and a test-case list (input/expected-output/is-sample). The student exam-taking flow gained a dedicated `CodingQuestion` component: a monospace code editor pre-filled with starter code, a language switcher (when multiple languages are enabled, code is kept per-language so switching doesn't lose work), visible sample test cases shown as worked examples, a "Run against samples" button, and a live pass/fail breakdown. The results page gained a coding-specific card: submitted code, language, and a per-test-case pass/fail list (now including previously-hidden cases, revealed post-submission).

**Done criteria**: verified via curl that all three languages (Python, Java, C++) execute correctly through JDoodle and grade correctly against both sample and hidden test cases; then browser-verified end-to-end — admin builds a coding question through the actual UI form, publishes it, student takes the exam, runs code against samples (sees live pass/fail), submits, and the results page shows 100% with both test cases (including the hidden one) passed — zero console errors throughout.

## Phase 7: UI Polish
Two rounds, both user-directed after the core features were functional:
1. **Collapsible sidebar** — added a `SidebarProvider` context (state must live above `<Routes>`, since each route's `AppShell` instance otherwise remounts and would reset local state) with a toggle button, icon-only collapsed state with tooltips, and `localStorage` persistence.
2. **Color palette change** — replaced the initial indigo/violet accent with an amber/orange palette (closer to Whizlabs' actual brand color), updated in one place (the Tailwind `@theme` block) plus a handful of hardcoded hex values that lived outside the token system (the logo SVG, favicon, and ambient backdrop gradients).
**Done criteria**: both changes browser-verified with screenshots and zero console errors before/after.

## Phase 8: Testing (ongoing, not a separate deferred phase)
Every phase in this build was verified twice: once via direct backend API calls (curl) to confirm business logic (especially grading correctness) before touching the UI, and once end-to-end in a real headless browser (Playwright, driven via a scratch Node script since no `chromium-cli` was available in this environment) to confirm the frontend actually renders and behaves correctly with zero console errors — not just that `tsc` type-checks cleanly.

## Phase 9: Deployment
**Not yet done.** `docker-compose.yml` (Postgres + backend + frontend) exists and is ready to use; this was deliberately deferred because the local dev environment's Docker Desktop engine wasn't running, and native local Postgres + `uvicorn --reload` + `npm run dev` was faster to iterate on. Before a real deployment: move `JWT_SECRET_KEY` off its placeholder default, pick real hosting for Postgres/backend/frontend, and decide on PDF storage (local disk won't survive a redeploy on most hosts — would need object storage).

## Known Gaps / Explicitly Out of Scope for This Build
- No exam editing after creation (only publish/unpublish) — editing would need the admin builder to load existing questions back into the form.
- Fill-in-the-blank supports one blank per question in the UI (schema supports more).
- Sidebar isn't adapted for mobile (no bottom-nav/drawer variant).
- No automated test suite (pytest) was written — verification was manual/scripted (curl + Playwright), not committed as regression tests.
- JDoodle's free tier (~200 executions/day) is shared across every coding-question run/submit — fine for a small class, but would need a paid tier or a self-hosted sandbox at real scale.

## Overall Done Criteria
A student can register, browse subjects, read a PDF, take an exam covering all 5 question types (including writing and running real code), see a correct graded result, post in and read a discussion thread, and see accurate progress numbers — and an admin can do everything needed to set that up (subject, PDF, exam, publish) — all with zero console errors, confirmed in a real browser, not just passing a type-check.

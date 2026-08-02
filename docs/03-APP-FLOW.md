# Document 03 — App Flow (Navigation & User Journey Map)

## Pages List
| Route | Description | Access |
|---|---|---|
| `/login` | Email/password sign-in | Public |
| `/register` | Creates a new **student** account (self-registration is always student role; admin is seeded, not self-assigned) | Public |
| `/dashboard` | Stat tiles (subjects, exams available, exams attempted, average score) + "Ready to practice?" CTA | Authenticated |
| `/subjects` | Grid of subject cards (name, description, exam/PDF counts) + "New subject" (admin) | Authenticated |
| `/subjects/:id` | Subject detail: exams list (with publish toggle for admin, "Start exam" for students), Discussion link card, PDF list + upload (admin) | Authenticated |
| `/subjects/:subjectId/exams/new` | Exam builder: title/description/duration + dynamic question list (4 types) | Admin only |
| `/exams/:id/take` | Timed exam-taking flow: question palette, per-type question renderer, submit | Authenticated |
| `/exams/attempts/:attemptId` | Results: score ring, correct/incorrect/score stat tiles, per-question breakdown | Authenticated |
| `/discussion` | Subject picker for discussion (grid of subject cards) | Authenticated |
| `/subjects/:id/discussion` | Thread list for a subject + "New thread" | Authenticated |
| `/subjects/:id/discussion/:threadId` | Thread detail: original post + replies + reply box | Authenticated |
| `/progress` | Total attempts, average score, per-subject score bars | Authenticated |
| `*` (catch-all) | 404 "Page not found" | Public |

## Navigation Type
Persistent **left sidebar** (collapsible — toggles between full width with labels and icon-only, state persisted in `localStorage` via `SidebarProvider` so it survives route changes and reloads) containing: Dashboard, Subjects, Progress, Discussion, plus a user card and Log out at the bottom. No top navbar. Admin-only actions (create subject, upload PDF, build/publish exam) are contextual buttons inside the relevant page rather than a separate admin section in the nav — there is no standalone `/admin` route.

## First Screen
An unauthenticated visitor hitting `/` is redirected to `/dashboard`, which (via `ProtectedRoute`) redirects further to `/login` since there's no session. `/login` is the true first screen: centered card over the ambient dark background, with a link to `/register`.

## Auth Flow
```
/register (email, password, full name) → account created as role=student → JWT stored → /dashboard
/login (email, password) → JWT stored → /dashboard
```
There is no email verification or onboarding wizard step in this version — registration is immediate. `AuthContext` restores a session from a stored JWT on app load by calling `GET /auth/me`; if that fails (expired/invalid token), the token is cleared and the user is treated as logged out.

## Core User Journey 1 — Student takes a practice exam
1. Log in → `/dashboard`.
2. Click **Subjects** in the sidebar → `/subjects`.
3. Click a subject card → `/subjects/:id`.
4. Click **Start exam** on a published exam → `/exams/:id/take` (this also calls `POST /exams/:id/attempts` to open an attempt server-side, establishing the authoritative start time for the countdown).
5. Answer questions (navigable via the numbered palette; green = answered), timer counts down in the header.
6. Click **Submit exam** (or the timer hits zero, which auto-submits) → `POST /exams/attempts/:id/submit` → redirected to `/exams/attempts/:id`.
7. Results page shows score, percent, correct/incorrect counts, and per-question "your answer vs correct answer."

## Core User Journey 2 — Admin publishes a new exam
1. Log in as admin → `/subjects/:id`.
2. Click **New exam** → `/subjects/:subjectId/exams/new`.
3. Fill title/duration, then for each question: pick a type (dropdown swaps the sub-form), fill it in, **Add question** for more.
4. **Save exam** → `POST /exams` → redirected back to `/subjects/:id`, new exam appears in the list marked "Draft."
5. Click **Publish** on that exam's card → `PATCH /exams/:id/publish` → badge disappears, students can now see and start it.

## Empty States
- Subjects list with none yet: "No subjects yet." card.
- A subject with no exams: "No exams yet." card.
- A subject with no PDFs: "No PDFs uploaded yet." card.
- A subject with no discussion threads: "No discussion threads yet — start one." card.
- Progress page with zero attempts: message directing the student to `/subjects` to take their first exam, instead of showing empty stat tiles.

## Error States
- Wrong login credentials: inline "Incorrect email or password." under the form, no redirect.
- Registration failure (e.g. duplicate email): backend `detail` message surfaced inline under the form.
- Any unauthenticated API call (expired/missing JWT): backend returns 401 → `AuthContext` clears the stored token; the next render's `ProtectedRoute` check sends the user to `/login`.
- Role mismatch (e.g. a student hitting an admin-only route like the exam builder): `RoleRoute` redirects to `/dashboard` rather than showing a 403 page.
- Unknown route: catch-all renders a dedicated "404 — Page not found" screen with a button back to `/dashboard`.

## Modal / Overlay Interactions
All create/upload actions use a centered modal (`Modal` component, Framer Motion fade+scale, backdrop click or an X button to dismiss) rather than a separate page: "New subject," "Upload PDF," "New thread." The exam builder is the one exception — it's a full page, since the form is too large for a modal.

## Redirects
- After login/register success → `/dashboard`.
- After logout → token cleared, next protected-route check → `/login`.
- `/` (root) → always `/dashboard` (which itself redirects to `/login` if unauthenticated).
- After creating an exam → back to `/subjects/:id`.
- After creating a discussion thread → straight into the new thread's detail page, `/subjects/:id/discussion/:threadId`.
- After submitting an exam attempt → `/exams/attempts/:attemptId` (replacing history so back-navigation doesn't resubmit).

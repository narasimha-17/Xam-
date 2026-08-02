# Document 01 — Product Requirements Document (PRD)

## App Name
Xam+

## Tagline
Practice engineering subjects with timed exams, study PDFs, peer discussion, and progress tracking — all in one place.

## Problem
Engineering students preparing for exams (college assessments, competitive/certification-style tests) don't have one coherent tool that combines structured practice questions, reference material, and a way to ask doubts. They end up juggling scattered PDFs, random quiz sites with no analytics, and disconnected WhatsApp/Discord groups for doubts. Instructors have no lightweight way to publish practice material without standing up a full LMS.

## Core Value Proposition
One platform, two roles: instructors author subjects, PDFs, and auto-graded exams; students practice against them and immediately see where they stand — per-question feedback, per-subject accuracy, and a running score history — instead of a flat "you got 60%."

## Target User
**Students**: engineering undergrads/postgrads practicing for exams, who want quick, low-friction quizzes with instant feedback and a record of improvement over time, accessible from a browser without installing anything.

**Admins/Instructors**: the (usually small) group who create subjects, upload reference PDFs, and author exams. They need to build a multi-question exam quickly without fighting a clunky form, and to publish/unpublish it when ready.

## Core Features (Must Have)
- Email/password authentication with two roles: student, admin
- Subjects catalog (admin-created), each with optional topics for grouping
- PDF study library per subject (admin uploads, any authenticated user downloads/views)
- Practice exams per subject, admin-authored, with five question types: MCQ (single answer), MAQ (multiple answer), match-the-following, fill-in-the-blank, and coding (LeetCode-style — Python/Java/C++, stdin/stdout test cases, real execution)
- Server-side auto-grading for all five question types (partial credit for match/fill-blank/coding, all-or-nothing for MAQ, exact match for MCQ) — correct answers (and hidden test cases) never sent to the client before submission
- Coding questions: admin authors starter code + stdin/stdout test cases per language (some marked as visible "sample" cases, rest hidden); student gets a code editor, can "Run" against samples for instant feedback before submitting, then final submission grades against all test cases (sample + hidden) via a real code execution service
- Timed exam-taking flow with a question navigator and autosubmit on timeout
- Post-submission results page: score, percentage, and a per-question correct/incorrect breakdown showing the student's answer next to the correct one
- Discussion threads per subject (any authenticated user can start a thread and reply; thread/post owners and admins can delete their own)
- Progress dashboard: total attempts, average score, and a per-subject breakdown, computed from attempt history (no separate stored stats to keep in sync)

## Nice to Have (not in this version)
- Exam editing after creation (currently: create-only, publish/unpublish toggle only)
- Multi-blank fill-in-the-blank questions (currently: one blank per question)
- Topic-level filtering/search on the PDF library
- Bulk admin actions, CSV import of questions
- Email notifications for discussion replies
- Analytics/charts beyond the current stat tiles and score bars

## Out of Scope
- Payments/subscriptions — the platform is free/internal-use in this version
- Native mobile apps — web only, responsive but not app-store distributed
- Proctoring/anti-cheating measures during exams
- Manual/subjective grading queue (all four supported question types are auto-gradable by design)
- Multi-tenant/organization support — single deployment, one shared user pool

## User Stories
- As a **student**, I want to browse subjects and see how many exams/PDFs each has, so I can decide what to practice next.
- As a **student**, I want to take a timed exam with a clear countdown and question navigator, so I don't lose track of time or unanswered questions.
- As a **student**, I want to see exactly which questions I got wrong and what the correct answer was, so I can learn from mistakes immediately.
- As a **student**, I want a progress view broken down by subject, so I know where I'm weak.
- As a **student**, I want to ask a question in a subject's discussion and get replies from peers or the instructor.
- As an **admin**, I want to create a subject and upload PDFs to it, so students have reference material.
- As an **admin**, I want to build an exam with a mix of MCQ/MAQ/match/fill-blank questions in one form, and publish it only when it's ready.

## Success Metrics
- A student can go from login → pick a subject → complete an exam → see a correct results breakdown with zero dead ends or console errors.
- An admin can create a subject, upload a PDF, author a 4-question-type exam, and publish it in under 5 minutes.
- Grading is exactly correct for all four question types, verified against known inputs (confirmed via direct API tests: MCQ, MAQ, match partial credit, and fill-blank case-insensitive matching all scored as expected).

import asyncio
import json
from contextlib import asynccontextmanager
from typing import TypedDict

import httpx

from app.core.config import settings

_lock = asyncio.Lock()


class OllamaBusy(Exception):
    """Raised when another Ollama request is already in flight — this local model can only run one at a time."""


@asynccontextmanager
async def ollama_slot():
    """Serializes access to the local Ollama model so concurrent admins/students can't pile up requests
    on a CPU-bound model that already takes minutes per call. Rejects immediately instead of queuing."""
    if _lock.locked():
        raise OllamaBusy()
    async with _lock:
        yield

SCHEMA_BY_TYPE: dict[str, str] = {
    "mcq": """{
  "questions": [
    {
      "type": "mcq",
      "question_text": "string",
      "points": 1,
      "options": [
        {"option_text": "string", "is_correct": true, "order": 0},
        {"option_text": "string", "is_correct": false, "order": 1},
        {"option_text": "string", "is_correct": false, "order": 2},
        {"option_text": "string", "is_correct": false, "order": 3}
      ]
    }
  ]
}
Rules: exactly 4 options, exactly ONE option with is_correct true.""",
    "maq": """{
  "questions": [
    {
      "type": "maq",
      "question_text": "string",
      "points": 1,
      "options": [
        {"option_text": "string", "is_correct": true, "order": 0},
        {"option_text": "string", "is_correct": true, "order": 1},
        {"option_text": "string", "is_correct": false, "order": 2},
        {"option_text": "string", "is_correct": false, "order": 3}
      ]
    }
  ]
}
Rules: 4-5 options, AT LEAST TWO options with is_correct true.""",
    "fill_blank": """{
  "questions": [
    {
      "type": "fill_blank",
      "question_text": "string containing EXACTLY ONE ___ blank",
      "points": 1,
      "fill_blank_answers": [
        {"blank_index": 0, "accepted_answers": ["answer", "Answer", "synonym"]}
      ]
    }
  ]
}
Rules: question_text has exactly one ___ blank (never more than one), fill_blank_answers has exactly one
entry with blank_index 0, accepted_answers lists case variants/synonyms accepted for that blank.""",
    "match": """{
  "questions": [
    {
      "type": "match",
      "question_text": "string, e.g. 'Match each term to its definition'",
      "points": 1,
      "match_pairs": [
        {"left_text": "string", "right_text": "string", "order": 0}
      ]
    }
  ]
}
Rules: 4-6 match_pairs, each left_text/right_text pair must correspond to each other.""",
    "coding": """{
  "questions": [
    {
      "type": "coding",
      "question_text": "string: full problem statement including input/output format and constraints",
      "points": 5,
      "languages": ["python", "java", "cpp"],
      "starter_code": {
        "python": "def solve():\\n    pass\\n",
        "java": "public class Main {\\n    public static void main(String[] args) {\\n    }\\n}\\n",
        "cpp": "#include <iostream>\\nusing namespace std;\\n\\nint main() {\\n    return 0;\\n}\\n"
      },
      "test_cases": [
        {"input": "string fed to stdin", "expected_output": "string expected on stdout", "is_sample": true, "order": 0}
      ]
    }
  ]
}
Rules: 3-5 test_cases, at least 1 with is_sample true, solution reads from stdin and writes to stdout in all
three languages, expected_output must exactly match what a correct stdout-printing solution would output
(no trailing explanation text).""",
}


class GenerationOutcome(TypedDict):
    questions: list[dict]
    error: str | None


async def generate_questions(topic: str, subject_name: str, question_type: str, count: int) -> GenerationOutcome:
    """Asks the local Ollama model for exam question candidates as JSON.

    Never raises — network failures, a down/missing model, or malformed JSON all come
    back as a non-None `error` so the caller can surface it and let the admin retry,
    rather than 500ing the request.
    """
    schema = SCHEMA_BY_TYPE.get(question_type)
    if schema is None:
        return {"questions": [], "error": f"Unsupported question type: {question_type}"}

    prompt = f"""You are helping a college engineering instructor draft exam practice questions.

Subject: {subject_name}
Topic / instructions from the instructor: {topic}

Generate exactly {count} distinct "{question_type}" question(s) at a level appropriate for an
engineering student practicing this subject. Vary the difficulty and specific concept tested
across the questions.

Respond with ONLY a single JSON object, no markdown code fences, no commentary, matching this
exact shape:
{schema}
"""

    try:
        async with httpx.AsyncClient(timeout=3600.0) as client:
            resp = await client.post(
                f"{settings.ollama_host}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.7},
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        return {"questions": [], "error": "Could not reach Ollama — is `ollama serve` running?"}
    except httpx.HTTPStatusError as exc:
        try:
            detail = exc.response.json().get("error", exc.response.text)
        except Exception:
            detail = exc.response.text
        if exc.response.status_code == 404:
            return {
                "questions": [],
                "error": f"Ollama model '{settings.ollama_model}' isn't ready yet ({detail}). "
                "It may still be downloading — try again shortly.",
            }
        return {"questions": [], "error": f"Ollama request failed: {detail}"}
    except httpx.HTTPError as exc:
        return {"questions": [], "error": f"Ollama request failed: {exc}"}
    except Exception as exc:  # malformed response, etc.
        return {"questions": [], "error": f"Unexpected error calling Ollama: {exc}"}

    raw = data.get("response", "")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {"questions": [], "error": "Model did not return valid JSON. Try again or lower the count."}

    questions = parsed.get("questions") if isinstance(parsed, dict) else None
    if not isinstance(questions, list):
        return {"questions": [], "error": "Model response was JSON but missing a 'questions' list."}

    return {"questions": questions, "error": None}


EXPLAIN_SCHEMA = """{
  "title": "string, a short catchy title for the explanation",
  "story": "string, 3-5 short paragraphs separated by blank lines, explaining the concept as a narrative or
    relatable real-world analogy — engaging but technically accurate",
  "examples": [
    {"title": "string, short label for the example", "explanation": "string, 2-4 sentences walking through it"}
  ],
  "related_topics": ["string", "string", "string"]
}
Rules: 2-4 examples grounded in the subject, 3-5 related_topics as short keyword phrases only
(no URLs, no sentences — just topic names someone could search for)."""


class ExplainOutcome(TypedDict):
    data: dict | None
    error: str | None


async def _run_explain_prompt(prompt: str) -> ExplainOutcome:
    """Shared caller for the topic/PDF explainer prompts — same never-raises contract as generate_questions."""
    try:
        async with httpx.AsyncClient(timeout=3600.0) as client:
            resp = await client.post(
                f"{settings.ollama_host}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.6},
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        return {"data": None, "error": "Could not reach Ollama — is `ollama serve` running?"}
    except httpx.HTTPStatusError as exc:
        try:
            detail = exc.response.json().get("error", exc.response.text)
        except Exception:
            detail = exc.response.text
        if exc.response.status_code == 404:
            return {
                "data": None,
                "error": f"Ollama model '{settings.ollama_model}' isn't ready yet ({detail}). "
                "It may still be downloading — try again shortly.",
            }
        return {"data": None, "error": f"Ollama request failed: {detail}"}
    except httpx.HTTPError as exc:
        return {"data": None, "error": f"Ollama request failed: {exc}"}
    except Exception as exc:  # malformed response, etc.
        return {"data": None, "error": f"Unexpected error calling Ollama: {exc}"}

    raw = data.get("response", "")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {"data": None, "error": "Model did not return valid JSON. Try again."}

    if not isinstance(parsed, dict) or not parsed.get("story"):
        return {"data": None, "error": "Model response was JSON but missing expected fields."}

    return {"data": parsed, "error": None}


async def explain_topic(subject_name: str, topic: str) -> ExplainOutcome:
    """Asks the local Ollama model to explain a topic as a story, with examples and related topics."""
    prompt = f"""You are a friendly, encouraging tutor helping an engineering student understand a concept
while they practice for exams.

Subject: {subject_name}
Topic the student wants explained: {topic}

Write an engaging, easy-to-follow explanation of this topic as if telling a short story or using a
relatable real-world analogy, followed by concrete examples. Keep it technically accurate and relevant
to what the student would need for an exam on this subject.

Respond with ONLY a single JSON object, no markdown code fences, no commentary, matching this exact
shape:
{EXPLAIN_SCHEMA}
"""
    return await _run_explain_prompt(prompt)


INTERVIEW_QUESTION_SCHEMA = """{
  "question": "string, a single interview question"
}"""

INTERVIEW_FEEDBACK_SCHEMA = """{
  "overall_feedback": "string, 2-4 sentences summarizing the candidate's performance",
  "strengths": ["string", "string"],
  "improvements": ["string", "string"],
  "score": 7
}
Rules: score is an integer from 1 to 10, strengths/improvements each have 2-4 short, specific bullet points."""


def _format_history(history: list[dict]) -> str:
    if not history:
        return "(no questions asked yet — this is the first question)"
    return "\n\n".join(
        f"Q{i + 1}: {qa['question']}\nCandidate's answer: {qa['answer']}" for i, qa in enumerate(history)
    )


class InterviewQuestionOutcome(TypedDict):
    question: str | None
    error: str | None


async def generate_interview_question(job_role: str, history: list[dict]) -> InterviewQuestionOutcome:
    """Asks the local Ollama model for the next mock-interview question, given the role and prior Q&A."""
    prompt = f"""You are an experienced technical interviewer conducting a mock job interview for the role of
"{job_role}".

Conversation so far:
{_format_history(history)}

Ask ONE good next interview question for this role. Don't repeat a question already asked. Mix
technical/role-specific questions with occasional behavioral ones. Keep it concise (1-3 sentences).

Respond with ONLY a single JSON object, no markdown code fences, no commentary, matching this exact
shape:
{INTERVIEW_QUESTION_SCHEMA}
"""
    try:
        async with httpx.AsyncClient(timeout=3600.0) as client:
            resp = await client.post(
                f"{settings.ollama_host}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.8},
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        return {"question": None, "error": "Could not reach Ollama — is `ollama serve` running?"}
    except httpx.HTTPStatusError as exc:
        try:
            detail = exc.response.json().get("error", exc.response.text)
        except Exception:
            detail = exc.response.text
        return {"question": None, "error": f"Ollama request failed: {detail}"}
    except httpx.HTTPError as exc:
        return {"question": None, "error": f"Ollama request failed: {exc}"}
    except Exception as exc:
        return {"question": None, "error": f"Unexpected error calling Ollama: {exc}"}

    raw = data.get("response", "")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {"question": None, "error": "Model did not return valid JSON. Try again."}

    question = parsed.get("question") if isinstance(parsed, dict) else None
    if not isinstance(question, str) or not question.strip():
        return {"question": None, "error": "Model response was JSON but missing a 'question' field."}

    return {"question": question.strip(), "error": None}


class InterviewFeedbackOutcome(TypedDict):
    data: dict | None
    error: str | None


async def generate_interview_feedback(job_role: str, history: list[dict]) -> InterviewFeedbackOutcome:
    """Asks the local Ollama model to evaluate a completed mock interview transcript."""
    prompt = f"""You are an experienced technical interviewer who just finished a mock interview for the role of
"{job_role}".

Full transcript:
{_format_history(history)}

Give the candidate constructive, encouraging feedback on their overall performance across all answers.

Respond with ONLY a single JSON object, no markdown code fences, no commentary, matching this exact
shape:
{INTERVIEW_FEEDBACK_SCHEMA}
"""
    try:
        async with httpx.AsyncClient(timeout=3600.0) as client:
            resp = await client.post(
                f"{settings.ollama_host}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.6},
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        return {"data": None, "error": "Could not reach Ollama — is `ollama serve` running?"}
    except httpx.HTTPStatusError as exc:
        try:
            detail = exc.response.json().get("error", exc.response.text)
        except Exception:
            detail = exc.response.text
        return {"data": None, "error": f"Ollama request failed: {detail}"}
    except httpx.HTTPError as exc:
        return {"data": None, "error": f"Ollama request failed: {exc}"}
    except Exception as exc:
        return {"data": None, "error": f"Unexpected error calling Ollama: {exc}"}

    raw = data.get("response", "")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {"data": None, "error": "Model did not return valid JSON. Try again."}

    if not isinstance(parsed, dict) or not parsed.get("overall_feedback"):
        return {"data": None, "error": "Model response was JSON but missing expected fields."}

    return {"data": parsed, "error": None}


async def explain_pdf(subject_name: str, title: str, excerpt: str) -> ExplainOutcome:
    """Asks the local Ollama model to explain a PDF's content as a story, with examples and related topics."""
    prompt = f"""You are a friendly, encouraging tutor helping an engineering student understand a piece of
study material while they practice for exams.

Subject: {subject_name}
Document title: {title}
Document excerpt (may be truncated):
\"\"\"
{excerpt}
\"\"\"

Summarize and explain the key ideas in this document as if telling a short story or using a relatable
real-world analogy, followed by concrete examples grounded in the document's actual content.

Respond with ONLY a single JSON object, no markdown code fences, no commentary, matching this exact
shape:
{EXPLAIN_SCHEMA}
"""
    return await _run_explain_prompt(prompt)

import base64
from typing import TypedDict

import httpx

from app.core.config import settings

# Judge0 CE's default language IDs — see https://ce.judge0.com (Languages endpoint).
# These match a stock self-hosted Judge0 CE install; if your instance enables a
# different compiler set, adjust the IDs here.
JUDGE0_LANGUAGE_ID: dict[str, int] = {
    "python": 71,  # Python 3.8.1
    "java": 62,  # Java (OpenJDK 13.0.1)
    "cpp": 54,  # C++ (GCC 9.2.0)
}


class ExecutionOutcome(TypedDict):
    stdout: str
    stderr: str
    error: str | None


def _encode(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def _decode(text: str | None) -> str:
    if not text:
        return ""
    try:
        return base64.b64decode(text).decode("utf-8", errors="replace")
    except Exception:
        return text


async def run_code(language: str, code: str, stdin: str) -> ExecutionOutcome:
    """Executes code against stdin via a self-hosted Judge0 instance.

    Mirrors jdoodle.run_code's signature and never-raises behavior so either
    service can back the coding-practice grading/run-sample paths.
    """
    if not settings.judge0_url:
        return {"stdout": "", "stderr": "", "error": "Code execution is not configured (missing JUDGE0_URL)"}

    language_id = JUDGE0_LANGUAGE_ID.get(language)
    if language_id is None:
        return {"stdout": "", "stderr": "", "error": f"Unsupported language: {language}"}

    payload = {
        "source_code": _encode(code),
        "language_id": language_id,
        "stdin": _encode(stdin),
    }
    headers = {"Content-Type": "application/json"}
    if settings.judge0_api_key:
        headers["X-Auth-Token"] = settings.judge0_api_key

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.judge0_url.rstrip('/')}/submissions",
                params={"base64_encoded": "true", "wait": "true"},
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        return {"stdout": "", "stderr": "", "error": f"Execution service unavailable: {exc}"}
    except Exception as exc:  # malformed JSON, etc. — never let a bad response 500 the request
        return {"stdout": "", "stderr": "", "error": f"Unexpected execution error: {exc}"}

    stdout = _decode(data.get("stdout"))
    stderr = _decode(data.get("stderr"))

    # status.id == 3 is Judge0's "Accepted" (ran to completion, exit 0). Anything
    # else (compile error, runtime error, TLE, ...) surfaces as a failed test case.
    status_id = (data.get("status") or {}).get("id")
    if status_id != 3:
        description = (data.get("status") or {}).get("description", "Execution failed")
        detail = _decode(data.get("compile_output")) or stderr or _decode(data.get("message")) or description
        return {"stdout": stdout, "stderr": stderr, "error": detail}

    return {"stdout": stdout, "stderr": stderr, "error": None}

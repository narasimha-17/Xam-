from typing import TypedDict

import httpx

from app.core.config import settings

JDOODLE_URL = "https://api.jdoodle.com/v1/execute"

# JDoodle's (language, versionIndex) pairs. versionIndex maps to whatever JDoodle
# currently has installed for that language — see their compiler API reference if
# these ever need bumping to a newer index.
JDOODLE_LANGUAGE: dict[str, tuple[str, str]] = {
    "python": ("python3", "4"),
    "java": ("java", "4"),
    "cpp": ("cpp17", "0"),
}


class ExecutionOutcome(TypedDict):
    stdout: str
    stderr: str
    error: str | None


async def run_code(language: str, code: str, stdin: str) -> ExecutionOutcome:
    """Executes code against stdin via the JDoodle compiler API.

    Never raises — missing credentials, network failures, and JDoodle-reported
    errors are all surfaced as a non-None `error` string so callers can treat
    them as a failed test case rather than crashing the request.
    """
    if not settings.jdoodle_client_id or not settings.jdoodle_client_secret:
        return {"stdout": "", "stderr": "", "error": "Code execution is not configured (missing JDoodle credentials)"}

    mapping = JDOODLE_LANGUAGE.get(language)
    if mapping is None:
        return {"stdout": "", "stderr": "", "error": f"Unsupported language: {language}"}
    jdoodle_lang, version_index = mapping

    payload = {
        "clientId": settings.jdoodle_client_id,
        "clientSecret": settings.jdoodle_client_secret,
        "script": code,
        "stdin": stdin,
        "language": jdoodle_lang,
        "versionIndex": version_index,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(JDOODLE_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        return {"stdout": "", "stderr": "", "error": f"Execution service unavailable: {exc}"}
    except Exception as exc:  # malformed JSON, etc. — never let a bad response 500 the request
        return {"stdout": "", "stderr": "", "error": f"Unexpected execution error: {exc}"}

    if data.get("error"):
        return {"stdout": "", "stderr": "", "error": str(data["error"])}

    # JDoodle merges the script's stdout/stderr (including any compiler or runtime
    # error text) into a single "output" field — there's no separate error signal,
    # so we hand it straight to grading and let the output-comparison decide pass/fail.
    return {"stdout": data.get("output", ""), "stderr": "", "error": None}

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_radar import AiRadarItem
from app.services import ollama
from app.services.web_search import duckduckgo_search

logger = logging.getLogger(__name__)

DEFAULT_QUERIES = [
    "new AI model release",
    "LLM capability update",
    "Anthropic Claude new model",
    "OpenAI new model release",
    "Moonshot AI Kimi model release",
    "Google Gemini new model release",
    "open source LLM release",
]

MAX_NEW_ITEMS_PER_QUERY = 5


async def run_ai_radar_pipeline(db: AsyncSession) -> dict:
    """Searches DuckDuckGo for AI/model-release news, reasons about new results with the local
    Ollama model, and stores them. Never raises — a bad query or a down Ollama just means fewer
    (or zero) items added, reported back via `error`, rather than failing the whole daily run."""
    existing_urls = set((await db.scalars(select(AiRadarItem.url))).all())
    added = 0
    last_error: str | None = None

    for query in DEFAULT_QUERIES:
        results = await duckduckgo_search(query)
        new_count = 0
        for result in results:
            if new_count >= MAX_NEW_ITEMS_PER_QUERY:
                break
            url = result.get("href") or result.get("url")
            title = result.get("title")
            if not url or not title or url in existing_urls:
                continue
            existing_urls.add(url)
            new_count += 1

            snippet = result.get("body", "") or ""
            try:
                outcome = await ollama.reason_about_ai_news(title, snippet)
            except Exception:
                logger.exception("Reasoning failed for %r", url)
                outcome = {"data": None, "error": "Unexpected error during reasoning"}

            summary = None
            use_cases = None
            if outcome["error"]:
                last_error = outcome["error"]
            elif outcome["data"]:
                summary = outcome["data"].get("summary")
                cases = outcome["data"].get("use_cases")
                if isinstance(cases, list):
                    use_cases = "\n".join(f"- {c}" for c in cases)

            db.add(
                AiRadarItem(
                    title=title,
                    url=url,
                    source=result.get("source") or None,
                    snippet=snippet or None,
                    query=query,
                    summary=summary,
                    use_cases=use_cases,
                    is_manual=False,
                )
            )
            added += 1

    if added:
        await db.commit()

    return {"added": added, "error": last_error}

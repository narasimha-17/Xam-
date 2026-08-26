import asyncio
import logging

logger = logging.getLogger(__name__)


async def duckduckgo_search(query: str, max_results: int = 8, timelimit: str = "d") -> list[dict]:
    """Runs a DuckDuckGo text search for `query`, most recent first.

    `ddgs` is a sync library, so the actual call runs in a thread. Never raises — a rate limit,
    network error, or library hiccup just means no results for this query today rather than
    aborting the whole daily pipeline run.
    """
    from ddgs import DDGS

    def _search() -> list[dict]:
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results, timelimit=timelimit))

    try:
        return await asyncio.to_thread(_search)
    except Exception:
        logger.exception("DuckDuckGo search failed for query %r", query)
        return []

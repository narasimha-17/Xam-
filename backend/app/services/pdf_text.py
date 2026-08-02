from pypdf import PdfReader

MAX_EXCERPT_CHARS = 8000


def extract_pdf_excerpt(file_path: str, max_chars: int = MAX_EXCERPT_CHARS) -> str:
    """Pulls plain text out of a PDF for feeding to the local LLM, capped to keep prompts fast."""
    reader = PdfReader(file_path)
    chunks: list[str] = []
    length = 0
    for page in reader.pages:
        text = (page.extract_text() or "").strip()
        if not text:
            continue
        chunks.append(text)
        length += len(text)
        if length >= max_chars:
            break
    return "\n\n".join(chunks)[:max_chars]

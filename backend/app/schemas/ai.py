from pydantic import BaseModel


class ExplainExample(BaseModel):
    title: str
    explanation: str


class RelatedLink(BaseModel):
    label: str
    url: str


class TopicExplainIn(BaseModel):
    subject_id: int
    topic: str


class PdfExplainIn(BaseModel):
    pdf_id: int


class ExplainOut(BaseModel):
    title: str = ""
    story: str = ""
    examples: list[ExplainExample] = []
    related_links: list[RelatedLink] = []
    error: str | None = None

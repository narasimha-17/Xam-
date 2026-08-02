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


class InterviewQAPair(BaseModel):
    question: str
    answer: str


class InterviewQuestionIn(BaseModel):
    job_role: str
    history: list[InterviewQAPair] = []


class InterviewQuestionOut(BaseModel):
    question: str | None = None
    error: str | None = None


class InterviewFeedbackIn(BaseModel):
    job_role: str
    history: list[InterviewQAPair] = []


class InterviewFeedbackOut(BaseModel):
    overall_feedback: str = ""
    strengths: list[str] = []
    improvements: list[str] = []
    score: int = 0
    error: str | None = None

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CodingTestCaseIn(BaseModel):
    input: str = ""
    expected_output: str
    is_sample: bool = False


class CodingTestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    input: str
    expected_output: str
    is_sample: bool


class CodingProblemIn(BaseModel):
    title: str
    description: str
    difficulty: str = "medium"
    tags: list[str] = []
    languages: list[str] = []
    starter_code: dict[str, str] = {}
    is_published: bool = False
    company_id: int | None = None
    test_cases: list[CodingTestCaseIn] = []


class CodingProblemAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    difficulty: str
    tags: list[str]
    languages: list[str]
    starter_code: dict[str, str]
    is_published: bool
    company_id: int | None
    created_at: datetime
    test_cases: list[CodingTestCaseOut]


class CodingProblemListItemOut(BaseModel):
    id: int
    title: str
    difficulty: str
    tags: list[str]
    languages: list[str]
    is_solved: bool


class SampleTestCaseOut(BaseModel):
    id: int
    input: str
    expected_output: str


class CodingProblemDetailOut(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    tags: list[str]
    languages: list[str]
    starter_code: dict[str, str]
    sample_test_cases: list[SampleTestCaseOut]
    hidden_test_case_count: int
    is_solved: bool


# ---------- Run / submit ----------


class RunCodeIn(BaseModel):
    language: str
    code: str


class TestCaseRunResultOut(BaseModel):
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    error: str | None


class RunCodeResultOut(BaseModel):
    test_case_results: list[TestCaseRunResultOut]
    passed_count: int
    total_count: int


class SubmitResultOut(BaseModel):
    is_solved: bool
    passed_count: int
    total_count: int
    # only sample test cases include full input/expected/actual detail; hidden ones are pass/fail only
    test_case_results: list[TestCaseRunResultOut]


class CodingSubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    language: str
    passed_count: int
    total_count: int
    is_solved: bool
    submitted_at: datetime

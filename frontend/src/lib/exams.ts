import { api } from "./api";
import type {
  AnswerIn,
  AttemptResult,
  AutosaveInput,
  ExamAdmin,
  ExamAttempt,
  ExamCreateInput,
  ExamSafe,
  ExamSummary,
  GenerateQuestionsInput,
  GenerateQuestionsResult,
  QuestionReportAdmin,
  QuestionReportInput,
  QuestionReportResult,
  RunCodeRequest,
  RunCodeResult,
} from "../types/api";

export async function fetchExams(subjectId?: number): Promise<ExamSummary[]> {
  const { data } = await api.get<ExamSummary[]>("/exams", { params: subjectId ? { subject_id: subjectId } : {} });
  return data;
}

export async function fetchExamForStudent(id: number): Promise<ExamSafe> {
  const { data } = await api.get<ExamSafe>(`/exams/${id}`);
  return data;
}

export async function fetchExamForAdmin(id: number): Promise<ExamAdmin> {
  const { data } = await api.get<ExamAdmin>(`/exams/${id}`);
  return data;
}

export async function createExam(payload: ExamCreateInput): Promise<ExamAdmin> {
  const { data } = await api.post<ExamAdmin>("/exams", payload);
  return data;
}

export async function replaceExam(id: number, payload: ExamCreateInput): Promise<ExamAdmin> {
  const { data } = await api.put<ExamAdmin>(`/exams/${id}`, payload);
  return data;
}

export async function setExamPublished(id: number, isPublished: boolean): Promise<ExamAdmin> {
  const { data } = await api.patch<ExamAdmin>(`/exams/${id}/publish`, { is_published: isPublished });
  return data;
}

export async function deleteExam(id: number): Promise<void> {
  await api.delete(`/exams/${id}`);
}

export async function duplicateExam(id: number): Promise<ExamAdmin> {
  const { data } = await api.post<ExamAdmin>(`/exams/${id}/duplicate`);
  return data;
}

export async function autosaveAttempt(attemptId: number, payload: AutosaveInput): Promise<void> {
  await api.patch(`/exams/attempts/${attemptId}/autosave`, payload);
}

export async function startAttempt(examId: number): Promise<ExamAttempt> {
  const { data } = await api.post<ExamAttempt>(`/exams/${examId}/attempts`);
  return data;
}

export async function submitAttempt(attemptId: number, answers: AnswerIn[]): Promise<AttemptResult> {
  const { data } = await api.post<AttemptResult>(`/exams/attempts/${attemptId}/submit`, { answers });
  return data;
}

export async function fetchAttempt(attemptId: number): Promise<AttemptResult> {
  const { data } = await api.get<AttemptResult>(`/exams/attempts/${attemptId}`);
  return data;
}

export async function fetchMyAttempts(examId?: number): Promise<ExamAttempt[]> {
  const { data } = await api.get<ExamAttempt[]>("/exams/attempts/mine", {
    params: examId ? { exam_id: examId } : {},
  });
  return data;
}

export async function runCodeAgainstSamples(questionId: number, payload: RunCodeRequest): Promise<RunCodeResult> {
  const { data } = await api.post<RunCodeResult>(`/exams/questions/${questionId}/run`, payload);
  return data;
}

export async function generateQuestions(payload: GenerateQuestionsInput): Promise<GenerateQuestionsResult> {
  const { data } = await api.post<GenerateQuestionsResult>("/exams/generate-questions", payload, {
    timeout: 3_600_000,
  });
  return data;
}

export async function reportQuestion(questionId: number, payload: QuestionReportInput): Promise<QuestionReportResult> {
  const { data } = await api.post<QuestionReportResult>(`/exams/questions/${questionId}/report`, payload);
  return data;
}

export async function fetchQuestionReports(): Promise<QuestionReportAdmin[]> {
  const { data } = await api.get<QuestionReportAdmin[]>("/exams/reports/all");
  return data;
}

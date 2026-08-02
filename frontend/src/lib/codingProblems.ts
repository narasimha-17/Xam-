import { api } from "./api";
import type {
  CodingProblemAdmin,
  CodingProblemDetail,
  CodingProblemInput,
  CodingProblemListItem,
  CodingRunResult,
  CodingSubmission,
  CodingSubmitResult,
} from "../types/api";

export async function fetchCodingStatus(): Promise<{ enabled: boolean }> {
  const { data } = await api.get<{ enabled: boolean }>("/coding-problems/status");
  return data;
}

export async function fetchCodingProblems(): Promise<CodingProblemListItem[]> {
  const { data } = await api.get<CodingProblemListItem[]>("/coding-problems");
  return data;
}

export async function fetchCodingProblem(id: number): Promise<CodingProblemDetail> {
  const { data } = await api.get<CodingProblemDetail>(`/coding-problems/${id}`);
  return data;
}

export async function fetchMySubmissions(problemId: number): Promise<CodingSubmission[]> {
  const { data } = await api.get<CodingSubmission[]>(`/coding-problems/${problemId}/submissions`);
  return data;
}

export async function runCodingProblem(
  problemId: number,
  payload: { language: string; code: string },
): Promise<CodingRunResult> {
  const { data } = await api.post<CodingRunResult>(`/coding-problems/${problemId}/run`, payload);
  return data;
}

export async function submitCodingProblem(
  problemId: number,
  payload: { language: string; code: string },
): Promise<CodingSubmitResult> {
  const { data } = await api.post<CodingSubmitResult>(`/coding-problems/${problemId}/submit`, payload);
  return data;
}

export async function fetchAdminCodingProblems(): Promise<CodingProblemAdmin[]> {
  const { data } = await api.get<CodingProblemAdmin[]>("/coding-problems/admin/all");
  return data;
}

export async function createCodingProblem(payload: CodingProblemInput): Promise<CodingProblemAdmin> {
  const { data } = await api.post<CodingProblemAdmin>("/coding-problems/admin", payload);
  return data;
}

export async function updateCodingProblem(
  id: number,
  payload: CodingProblemInput,
): Promise<CodingProblemAdmin> {
  const { data } = await api.patch<CodingProblemAdmin>(`/coding-problems/admin/${id}`, payload);
  return data;
}

export async function deleteCodingProblem(id: number): Promise<void> {
  await api.delete(`/coding-problems/admin/${id}`);
}

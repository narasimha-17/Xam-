import { api } from "./api";
import type { Resume, ResumeInput, ResumeScoreResult } from "../types/api";

export async function fetchMyResume(): Promise<Resume | null> {
  try {
    const { data } = await api.get<Resume>("/resume/me");
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}

export async function saveMyResume(payload: ResumeInput): Promise<Resume> {
  const { data } = await api.put<Resume>("/resume/me", payload);
  return data;
}

export async function scoreMyResume(jobId: number | null): Promise<ResumeScoreResult> {
  const { data } = await api.post<ResumeScoreResult>("/resume/score", { job_id: jobId });
  return data;
}

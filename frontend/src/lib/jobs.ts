import { api } from "./api";
import type { JobPosting, JobPostingAdmin, JobPostingInput } from "../types/api";

export async function fetchJobs(): Promise<JobPosting[]> {
  const { data } = await api.get<JobPosting[]>("/jobs");
  return data;
}

export async function fetchJob(id: number): Promise<JobPosting> {
  const { data } = await api.get<JobPosting>(`/jobs/${id}`);
  return data;
}

export async function fetchAdminJobs(): Promise<JobPostingAdmin[]> {
  const { data } = await api.get<JobPostingAdmin[]>("/jobs/admin/all");
  return data;
}

export async function createJob(payload: JobPostingInput): Promise<JobPostingAdmin> {
  const { data } = await api.post<JobPostingAdmin>("/jobs/admin", payload);
  return data;
}

export async function updateJob(id: number, payload: JobPostingInput): Promise<JobPostingAdmin> {
  const { data } = await api.patch<JobPostingAdmin>(`/jobs/admin/${id}`, payload);
  return data;
}

export async function deleteJob(id: number): Promise<void> {
  await api.delete(`/jobs/admin/${id}`);
}

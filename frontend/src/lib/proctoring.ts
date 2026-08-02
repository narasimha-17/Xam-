import { api } from "./api";
import type { ProctorEventAdmin, ProctorEventInput, ProctorSummary } from "../types/api";

export async function logProctorEvent(attemptId: number, payload: ProctorEventInput): Promise<void> {
  // Best-effort — proctoring signals should never block or crash the exam-taking flow.
  await api.post(`/proctoring/attempts/${attemptId}/events`, payload).catch(() => {});
}

export async function fetchProctorSummary(attemptId: number): Promise<ProctorSummary> {
  const { data } = await api.get<ProctorSummary>(`/proctoring/attempts/${attemptId}/summary`);
  return data;
}

export async function fetchProctorEvents(attemptId: number): Promise<ProctorEventAdmin[]> {
  const { data } = await api.get<ProctorEventAdmin[]>(`/proctoring/attempts/${attemptId}/events`);
  return data;
}

export async function fetchProctorSnapshotUrl(eventId: number): Promise<string> {
  const { data } = await api.get(`/proctoring/events/${eventId}/snapshot`, { responseType: "blob" });
  return URL.createObjectURL(data as Blob);
}

import { api } from "./api";
import type { StudyEvent, StudyEventInput } from "../types/api";

export async function fetchStudyEvents(fromDate?: string, toDate?: string): Promise<StudyEvent[]> {
  const { data } = await api.get<StudyEvent[]>("/study-events", {
    params: { from_date: fromDate, to_date: toDate },
  });
  return data;
}

export async function createStudyEvent(payload: StudyEventInput): Promise<StudyEvent> {
  const { data } = await api.post<StudyEvent>("/study-events", payload);
  return data;
}

export async function updateStudyEvent(id: number, payload: StudyEventInput): Promise<StudyEvent> {
  const { data } = await api.patch<StudyEvent>(`/study-events/${id}`, payload);
  return data;
}

export async function deleteStudyEvent(id: number): Promise<void> {
  await api.delete(`/study-events/${id}`);
}

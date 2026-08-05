import { api } from "./api";
import type { EducationLevel, Subject } from "../types/api";

export async function fetchSubjects(): Promise<Subject[]> {
  const { data } = await api.get<Subject[]>("/subjects");
  return data;
}

export async function fetchSubject(id: number): Promise<Subject> {
  const { data } = await api.get<Subject>(`/subjects/${id}`);
  return data;
}

export async function createSubject(
  name: string,
  description: string,
  educationLevel?: EducationLevel | "",
): Promise<Subject> {
  const { data } = await api.post<Subject>("/subjects", {
    name,
    description: description || null,
    education_level: educationLevel || null,
  });
  return data;
}

export async function updateSubject(
  id: number,
  payload: { name?: string; description?: string; education_level?: EducationLevel; clear_education_level?: boolean },
): Promise<Subject> {
  const { data } = await api.patch<Subject>(`/subjects/${id}`, payload);
  return data;
}

export async function deleteSubject(id: number): Promise<void> {
  await api.delete(`/subjects/${id}`);
}

export async function createTopic(subjectId: number, name: string) {
  const { data } = await api.post(`/subjects/${subjectId}/topics`, { name });
  return data;
}

export async function deleteTopic(topicId: number): Promise<void> {
  await api.delete(`/subjects/topics/${topicId}`);
}

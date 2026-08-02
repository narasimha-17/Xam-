import { api } from "./api";
import type { Badge, ProgressStats, StudentAttempt, StudentProgress } from "../types/api";

export async function fetchMyProgress(): Promise<ProgressStats> {
  const { data } = await api.get<ProgressStats>("/progress/me");
  return data;
}

export async function fetchMyBadges(): Promise<Badge[]> {
  const { data } = await api.get<Badge[]>("/progress/badges");
  return data;
}

export async function fetchAllStudentsProgress(): Promise<StudentProgress[]> {
  const { data } = await api.get<StudentProgress[]>("/progress/students");
  return data;
}

export async function fetchStudentAttempts(userId: number): Promise<StudentAttempt[]> {
  const { data } = await api.get<StudentAttempt[]>(`/progress/students/${userId}/attempts`);
  return data;
}

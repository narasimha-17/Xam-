import { api } from "./api";

export interface OsProgress {
  completed_level_ids: string[];
  total_xp: number;
}

export async function fetchOsProgress(): Promise<OsProgress> {
  const { data } = await api.get<OsProgress>("/os-learn/progress");
  return data;
}

export async function completeOsLevel(levelId: string, xp: number): Promise<OsProgress> {
  const { data } = await api.post<OsProgress>("/os-learn/progress", { level_id: levelId, xp });
  return data;
}

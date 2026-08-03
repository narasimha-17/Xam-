import { api } from "./api";

export interface GitProgress {
  completed_level_ids: string[];
  total_xp: number;
}

export async function fetchGitProgress(): Promise<GitProgress> {
  const { data } = await api.get<GitProgress>("/git-learn/progress");
  return data;
}

export async function completeGitLevel(levelId: string, xp: number): Promise<GitProgress> {
  const { data } = await api.post<GitProgress>("/git-learn/progress", { level_id: levelId, xp });
  return data;
}

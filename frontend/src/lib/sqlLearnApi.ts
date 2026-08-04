import { api } from "./api";

export interface SqlProgress {
  completed_level_ids: string[];
  total_xp: number;
}

export async function fetchSqlProgress(): Promise<SqlProgress> {
  const { data } = await api.get<SqlProgress>("/sql-learn/progress");
  return data;
}

export async function completeSqlLevel(levelId: string, xp: number): Promise<SqlProgress> {
  const { data } = await api.post<SqlProgress>("/sql-learn/progress", { level_id: levelId, xp });
  return data;
}

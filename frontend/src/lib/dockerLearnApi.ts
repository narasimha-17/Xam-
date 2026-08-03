import { api } from "./api";

export interface DockerProgress {
  completed_level_ids: string[];
  total_xp: number;
}

export async function fetchDockerProgress(): Promise<DockerProgress> {
  const { data } = await api.get<DockerProgress>("/docker-learn/progress");
  return data;
}

export async function completeDockerLevel(levelId: string, xp: number): Promise<DockerProgress> {
  const { data } = await api.post<DockerProgress>("/docker-learn/progress", { level_id: levelId, xp });
  return data;
}

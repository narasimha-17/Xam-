import { api } from "./api";

export interface K8sProgress {
  completed_level_ids: string[];
  total_xp: number;
}

export async function fetchK8sProgress(): Promise<K8sProgress> {
  const { data } = await api.get<K8sProgress>("/k8s-learn/progress");
  return data;
}

export async function completeK8sLevel(levelId: string, xp: number): Promise<K8sProgress> {
  const { data } = await api.post<K8sProgress>("/k8s-learn/progress", { level_id: levelId, xp });
  return data;
}

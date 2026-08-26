import { api } from "./api";
import type { AiRadarItem, AiRadarItemInput, AiRadarRunResult } from "../types/api";

export async function fetchAiRadarItems(): Promise<AiRadarItem[]> {
  const { data } = await api.get<AiRadarItem[]>("/ai-radar");
  return data;
}

export async function createAiRadarItem(payload: AiRadarItemInput): Promise<AiRadarItem> {
  const { data } = await api.post<AiRadarItem>("/ai-radar", payload);
  return data;
}

export async function updateAiRadarItem(id: number, payload: AiRadarItemInput): Promise<AiRadarItem> {
  const { data } = await api.patch<AiRadarItem>(`/ai-radar/${id}`, payload);
  return data;
}

export async function deleteAiRadarItem(id: number): Promise<void> {
  await api.delete(`/ai-radar/${id}`);
}

export async function runAiRadarPipeline(): Promise<AiRadarRunResult> {
  const { data } = await api.post<AiRadarRunResult>("/ai-radar/run");
  return data;
}

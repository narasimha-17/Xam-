import { api } from "./api";
import type { ExplainResult, PdfExplainInput, TopicExplainInput } from "../types/api";

export async function fetchAiStatus(): Promise<{ enabled: boolean }> {
  const { data } = await api.get<{ enabled: boolean }>("/ai/status");
  return data;
}

export async function explainTopic(payload: TopicExplainInput): Promise<ExplainResult> {
  const { data } = await api.post<ExplainResult>("/ai/explain-topic", payload, { timeout: 3_600_000 });
  return data;
}

export async function explainPdf(payload: PdfExplainInput): Promise<ExplainResult> {
  const { data } = await api.post<ExplainResult>("/ai/explain-pdf", payload, { timeout: 3_600_000 });
  return data;
}

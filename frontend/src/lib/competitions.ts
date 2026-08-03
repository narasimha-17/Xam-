import { api } from "./api";
import type { CompetitionAnswerResult, CompetitionState } from "../types/api";

export async function createCompetition(examId: number, timeLimitSeconds: number): Promise<CompetitionState> {
  const { data } = await api.post<CompetitionState>("/competitions", {
    exam_id: examId,
    time_limit_seconds: timeLimitSeconds,
  });
  return data;
}

export async function joinCompetition(code: string): Promise<CompetitionState> {
  const { data } = await api.post<CompetitionState>("/competitions/join", { code });
  return data;
}

export async function fetchCompetitionState(roomId: number): Promise<CompetitionState> {
  const { data } = await api.get<CompetitionState>(`/competitions/${roomId}`);
  return data;
}

export async function startCompetition(roomId: number): Promise<CompetitionState> {
  const { data } = await api.post<CompetitionState>(`/competitions/${roomId}/start`);
  return data;
}

export async function nextCompetitionQuestion(roomId: number): Promise<CompetitionState> {
  const { data } = await api.post<CompetitionState>(`/competitions/${roomId}/next`);
  return data;
}

export async function answerCompetitionQuestion(
  roomId: number,
  questionId: number,
  selectedOptionId: number,
): Promise<CompetitionAnswerResult> {
  const { data } = await api.post<CompetitionAnswerResult>(`/competitions/${roomId}/answer`, {
    question_id: questionId,
    selected_option_id: selectedOptionId,
  });
  return data;
}

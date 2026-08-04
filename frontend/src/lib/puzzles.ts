import { api } from "./api";
import type { PuzzleAdmin, PuzzleAttemptResult, PuzzleInput, PuzzleStreak, PuzzleToday } from "../types/api";

export async function fetchTodayPuzzle(): Promise<PuzzleToday> {
  const { data } = await api.get<PuzzleToday>("/puzzles/today");
  return data;
}

export async function attemptTodayPuzzle(puzzleId: number, selectedIndex: number): Promise<PuzzleAttemptResult> {
  const { data } = await api.post<PuzzleAttemptResult>("/puzzles/today/attempt", {
    puzzle_id: puzzleId,
    selected_index: selectedIndex,
  });
  return data;
}

export async function fetchPuzzleStreak(): Promise<PuzzleStreak> {
  const { data } = await api.get<PuzzleStreak>("/puzzles/streak");
  return data;
}

export async function fetchAdminPuzzles(): Promise<PuzzleAdmin[]> {
  const { data } = await api.get<PuzzleAdmin[]>("/puzzles/admin");
  return data;
}

export async function createPuzzle(payload: PuzzleInput): Promise<PuzzleAdmin> {
  const { data } = await api.post<PuzzleAdmin>("/puzzles/admin", payload);
  return data;
}

export async function updatePuzzle(id: number, payload: PuzzleInput): Promise<PuzzleAdmin> {
  const { data } = await api.patch<PuzzleAdmin>(`/puzzles/admin/${id}`, payload);
  return data;
}

export async function togglePuzzleActive(id: number): Promise<PuzzleAdmin> {
  const { data } = await api.patch<PuzzleAdmin>(`/puzzles/admin/${id}/toggle-active`);
  return data;
}

export async function deletePuzzle(id: number): Promise<void> {
  await api.delete(`/puzzles/admin/${id}`);
}

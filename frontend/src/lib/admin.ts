import { api } from "./api";
import type { ActivityLogEntry, PlatformStats } from "../types/api";

export async function fetchActivityLog(limit = 100): Promise<ActivityLogEntry[]> {
  const { data } = await api.get<ActivityLogEntry[]>("/admin/activity-log", { params: { limit } });
  return data;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data } = await api.get<PlatformStats>("/admin/stats");
  return data;
}

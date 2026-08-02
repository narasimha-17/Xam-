import { api } from "./api";
import type { Notification } from "../types/api";

export async function fetchNotifications(unreadOnly = false): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>("/notifications", { params: { unread_only: unreadOnly } });
  return data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}

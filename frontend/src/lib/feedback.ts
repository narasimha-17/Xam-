import { api } from "./api";
import type { FeedbackAdminItem, FeedbackItem } from "../types/api";

export async function submitFeedback(description: string, rating: number, image?: File | null): Promise<FeedbackItem> {
  const form = new FormData();
  form.set("description", description);
  form.set("rating", String(rating));
  if (image) form.set("image", image);

  const { data } = await api.post<FeedbackItem>("/feedback", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchMyFeedback(): Promise<FeedbackItem[]> {
  const { data } = await api.get<FeedbackItem[]>("/feedback/me");
  return data;
}

export async function fetchAdminFeedback(): Promise<FeedbackAdminItem[]> {
  const { data } = await api.get<FeedbackAdminItem[]>("/feedback/admin/all");
  return data;
}

export async function deleteFeedback(id: number): Promise<void> {
  await api.delete(`/feedback/admin/${id}`);
}

export async function fetchFeedbackImageUrl(feedbackId: number): Promise<string> {
  const { data } = await api.get(`/feedback/${feedbackId}/image`, { responseType: "blob" });
  return URL.createObjectURL(data);
}

import { api } from "./api";
import type { DiscussionThread, DiscussionThreadDetail, DiscussionPost } from "../types/api";

export async function fetchThreads(subjectId: number): Promise<DiscussionThread[]> {
  const { data } = await api.get<DiscussionThread[]>("/discussions", { params: { subject_id: subjectId } });
  return data;
}

export async function createThread(
  subjectId: number,
  title: string,
  body: string,
  image?: File | null,
): Promise<DiscussionThreadDetail> {
  const form = new FormData();
  form.set("subject_id", String(subjectId));
  form.set("title", title);
  form.set("body", body);
  if (image) form.set("image", image);

  const { data } = await api.post<DiscussionThreadDetail>("/discussions", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchThread(threadId: number): Promise<DiscussionThreadDetail> {
  const { data } = await api.get<DiscussionThreadDetail>(`/discussions/${threadId}`);
  return data;
}

export async function createPost(
  threadId: number,
  body: string,
  parentPostId?: number,
  image?: File | null,
): Promise<DiscussionPost> {
  const form = new FormData();
  form.set("body", body);
  if (parentPostId) form.set("parent_post_id", String(parentPostId));
  if (image) form.set("image", image);

  const { data } = await api.post<DiscussionPost>(`/discussions/${threadId}/posts`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteThread(threadId: number): Promise<void> {
  await api.delete(`/discussions/${threadId}`);
}

export async function deletePost(postId: number): Promise<void> {
  await api.delete(`/discussions/posts/${postId}`);
}

export async function setThreadLocked(threadId: number, isLocked: boolean): Promise<DiscussionThread> {
  const { data } = await api.patch<DiscussionThread>(`/discussions/${threadId}/lock`, { is_locked: isLocked });
  return data;
}

/** Fetches a post's image as an authenticated blob and returns an object URL for <img src>. */
export async function fetchPostImageUrl(postId: number): Promise<string> {
  const { data } = await api.get(`/discussions/posts/${postId}/image`, { responseType: "blob" });
  return URL.createObjectURL(data);
}

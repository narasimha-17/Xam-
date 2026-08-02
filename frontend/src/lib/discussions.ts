import { api } from "./api";
import type { DiscussionThread, DiscussionThreadDetail, DiscussionPost } from "../types/api";

export async function fetchThreads(subjectId: number): Promise<DiscussionThread[]> {
  const { data } = await api.get<DiscussionThread[]>("/discussions", { params: { subject_id: subjectId } });
  return data;
}

export async function createThread(subjectId: number, title: string, body: string): Promise<DiscussionThreadDetail> {
  const { data } = await api.post<DiscussionThreadDetail>("/discussions", { subject_id: subjectId, title, body });
  return data;
}

export async function fetchThread(threadId: number): Promise<DiscussionThreadDetail> {
  const { data } = await api.get<DiscussionThreadDetail>(`/discussions/${threadId}`);
  return data;
}

export async function createPost(threadId: number, body: string, parentPostId?: number): Promise<DiscussionPost> {
  const { data } = await api.post<DiscussionPost>(`/discussions/${threadId}/posts`, {
    body,
    parent_post_id: parentPostId ?? null,
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

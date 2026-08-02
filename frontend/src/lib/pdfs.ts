import { api } from "./api";
import type { Pdf } from "../types/api";

export async function fetchPdfs(subjectId?: number): Promise<Pdf[]> {
  const { data } = await api.get<Pdf[]>("/pdfs", { params: subjectId ? { subject_id: subjectId } : {} });
  return data;
}

export async function uploadPdf(params: {
  subjectId: number;
  topicId?: number | null;
  title: string;
  file: File;
}): Promise<Pdf> {
  const form = new FormData();
  form.set("subject_id", String(params.subjectId));
  if (params.topicId) form.set("topic_id", String(params.topicId));
  form.set("title", params.title);
  form.set("file", params.file);

  const { data } = await api.post<Pdf>("/pdfs", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deletePdf(id: number): Promise<void> {
  await api.delete(`/pdfs/${id}`);
}

/** Fetches the PDF as a blob (auth header attached by the axios interceptor) and opens it in a new tab. */
export async function openPdf(id: number): Promise<void> {
  const { data } = await api.get(`/pdfs/${id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

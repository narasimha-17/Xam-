import { api } from "./api";
import type { Course, CourseAdmin, CourseDetail, CourseInput, CourseVideo, CourseVideoInput } from "../types/api";

export async function fetchCourses(): Promise<Course[]> {
  const { data } = await api.get<Course[]>("/courses");
  return data;
}

export async function fetchAdminCourses(): Promise<CourseAdmin[]> {
  const { data } = await api.get<CourseAdmin[]>("/courses/admin/all");
  return data;
}

export async function fetchCourse(id: number): Promise<CourseDetail> {
  const { data } = await api.get<CourseDetail>(`/courses/${id}`);
  return data;
}

export async function createCourse(payload: CourseInput): Promise<CourseAdmin> {
  const { data } = await api.post<CourseAdmin>("/courses/admin", payload);
  return data;
}

export async function updateCourse(id: number, payload: CourseInput): Promise<CourseAdmin> {
  const { data } = await api.patch<CourseAdmin>(`/courses/admin/${id}`, payload);
  return data;
}

export async function deleteCourse(id: number): Promise<void> {
  await api.delete(`/courses/admin/${id}`);
}

export async function createCourseVideo(courseId: number, payload: CourseVideoInput): Promise<CourseVideo> {
  const { data } = await api.post<CourseVideo>(`/courses/admin/${courseId}/videos`, payload);
  return data;
}

export async function updateCourseVideo(videoId: number, payload: CourseVideoInput): Promise<CourseVideo> {
  const { data } = await api.patch<CourseVideo>(`/courses/admin/videos/${videoId}`, payload);
  return data;
}

export async function deleteCourseVideo(videoId: number): Promise<void> {
  await api.delete(`/courses/admin/videos/${videoId}`);
}

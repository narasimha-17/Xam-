import axios from "axios";
import { auth } from "./firebase";
import type { EducationLevel, Gender, ProfileStats, User } from "../types/api";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

api.interceptors.request.use(async (config) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export interface UpdateProfilePayload {
  full_name?: string;
  roll_number?: string;
  section?: string;
  department?: string;
  phone_number?: string;
  location?: string;
  institution?: string;
  gender?: Gender;
  education_level?: EducationLevel;
  avatar_id?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await api.patch<User>("/auth/me", payload);
  return data;
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const { data } = await api.get<ProfileStats>("/auth/me/stats");
  return data;
}

import axios from "axios";
import type { Token, User } from "../types/api";

export const TOKEN_STORAGE_KEY = "xamplus_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  location: string;
  institution: string;
}

export async function registerRequest(payload: RegisterPayload): Promise<Token> {
  const { data } = await api.post<Token>("/auth/register", payload);
  return data;
}

export async function loginRequest(email: string, password: string): Promise<Token> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  const { data } = await api.post<Token>("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone_number?: string;
  location?: string;
  institution?: string;
  current_password?: string;
  new_password?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await api.patch<User>("/auth/me", payload);
  return data;
}

export async function forgotPassword(email: string): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("/auth/reset-password", { token, new_password: newPassword });
}

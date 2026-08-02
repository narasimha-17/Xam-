import { api } from "./api";
import type { AdminResetPasswordResult, User, UserRole } from "../types/api";

export async function fetchUsers(params?: { search?: string; role?: UserRole }): Promise<User[]> {
  const { data } = await api.get<User[]>("/users", { params });
  return data;
}

export async function updateUserRole(userId: number, role: UserRole): Promise<User> {
  const { data } = await api.patch<User>(`/users/${userId}/role`, { role });
  return data;
}

export async function updateUserActive(userId: number, isActive: boolean): Promise<User> {
  const { data } = await api.patch<User>(`/users/${userId}/active`, { is_active: isActive });
  return data;
}

export async function adminResetPassword(userId: number): Promise<AdminResetPasswordResult> {
  const { data } = await api.post<AdminResetPasswordResult>(`/users/${userId}/reset-password`);
  return data;
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { adminResetPassword, fetchUsers, updateUserActive, updateUserRole } from "../../lib/users";
import type { User, UserRole } from "../../types/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { SearchInput } from "../../components/ui/SearchInput";

export function UserManagement() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [resetResult, setResetResult] = useState<{ user: User; password: string } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: () => fetchUsers({ search: search || undefined, role: roleFilter || undefined }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) => updateUserRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateUserActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const resetMutation = useMutation({
    mutationFn: (u: User) => adminResetPassword(u.id).then((r) => ({ user: u, password: r.temporary_password })),
    onSuccess: (result) => setResetResult(result),
  });

  if (isLoading) return <Loader className="py-24" label="Loading users..." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">User management</h1>
        <p className="mt-1 text-sm text-ink-muted">Manage roles, account status, and password resets.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." className="max-w-sm" />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "" | UserRole)} className="w-fit">
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="admin">Admins</option>
        </Select>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => {
              const isSelf = u.id === me?.id;
              return (
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{u.full_name}</p>
                    <p className="text-xs text-ink-faint">{u.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "admin" ? "bg-accent/10 text-accent" : "bg-black/5 text-ink-muted"
                      }`}
                    >
                      {u.role === "admin" && <ShieldCheck size={11} />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                      }`}
                    >
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        disabled={isSelf}
                        isLoading={roleMutation.isPending && roleMutation.variables?.id === u.id}
                        onClick={() =>
                          roleMutation.mutate({ id: u.id, role: u.role === "admin" ? "student" : "admin" })
                        }
                      >
                        {u.role === "admin" ? "Make student" : "Make admin"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={isSelf}
                        isLoading={activeMutation.isPending && activeMutation.variables?.id === u.id}
                        onClick={() => activeMutation.mutate({ id: u.id, isActive: !u.is_active })}
                        className={u.is_active ? "hover:border-danger/40 hover:text-danger" : ""}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <button
                        onClick={() => resetMutation.mutate(u)}
                        className="flex items-center gap-1 rounded-lg p-2 text-ink-faint transition-colors hover:bg-accent/10 hover:text-accent-soft"
                        aria-label={`Reset password for ${u.full_name}`}
                      >
                        <KeyRound size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-ink-muted">
                  <Users size={20} className="mx-auto mb-2 text-ink-faint" />
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={resetResult !== null} onClose={() => setResetResult(null)} title="Temporary password">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Share this temporary password with <span className="font-medium text-ink">{resetResult?.user.full_name}</span>{" "}
            so they can sign in and change it. It will not be shown again.
          </p>
          <p className="select-all rounded-xl border border-black/10 bg-base-soft/60 px-4 py-3 text-center font-mono text-lg text-ink">
            {resetResult?.password}
          </p>
          <Button onClick={() => setResetResult(null)} className="w-full">
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}

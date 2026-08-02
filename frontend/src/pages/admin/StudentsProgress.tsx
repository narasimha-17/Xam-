import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShieldAlert, Users } from "lucide-react";
import { fetchAllStudentsProgress } from "../../lib/progress";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { SearchInput } from "../../components/ui/SearchInput";
import { cn } from "../../lib/utils";

function scoreColor(pct: number) {
  if (pct >= 75) return "text-success";
  if (pct >= 50) return "text-warning";
  return "text-danger";
}

export function StudentsProgress() {
  const [search, setSearch] = useState("");
  const { data: students, isLoading } = useQuery({
    queryKey: ["all-students-progress"],
    queryFn: fetchAllStudentsProgress,
  });

  if (isLoading) return <Loader className="py-24" label="Loading students..." />;

  const filtered = (students ?? []).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.roll_number ?? "").toLowerCase().includes(q)
    );
  });

  const attempted = filtered.filter((s) => s.total_attempts > 0);
  const overallAvg = attempted.length
    ? Math.round((attempted.reduce((sum, s) => sum + s.average_score_pct, 0) / attempted.length) * 10) / 10
    : 0;
  const flagged = filtered.filter((s) => s.total_violations > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Student progress</h1>
        <p className="mt-1 text-sm text-ink-muted">Every student's attempts, average score, and proctoring flags.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
            <Users size={18} />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-ink">{students?.length ?? 0}</p>
            <p className="text-xs text-ink-muted">Total students</p>
          </div>
        </Card>
        <Card>
          <p className="font-display text-2xl font-semibold text-ink">{attempted.length}</p>
          <p className="text-xs text-ink-muted">Have attempted an exam</p>
        </Card>
        <Card>
          <p className="font-display text-2xl font-semibold text-ink">{overallAvg}%</p>
          <p className="text-xs text-ink-muted">Average score (active students)</p>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-ink">{flagged}</p>
            <p className="text-xs text-ink-muted">Flagged for malpractice</p>
          </div>
        </Card>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, or roll number..."
        className="max-w-sm"
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Roll number</th>
              <th className="px-5 py-3 font-medium">Attempts</th>
              <th className="px-5 py-3 font-medium">Average score</th>
              <th className="px-5 py-3 font-medium">Last attempt</th>
              <th className="px-5 py-3 font-medium">Violations</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.user_id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                <td className="px-5 py-3">
                  <Link to={`/admin/students/${s.user_id}`} className="hover:underline">
                    <p className="font-medium text-ink">{s.full_name}</p>
                    <p className="text-xs text-ink-faint">{s.email}</p>
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink-muted">{s.roll_number ?? "—"}</td>
                <td className="px-5 py-3 text-ink">{s.total_attempts}</td>
                <td className={`px-5 py-3 font-medium ${s.total_attempts ? scoreColor(s.average_score_pct) : "text-ink-faint"}`}>
                  {s.total_attempts ? `${s.average_score_pct}%` : "—"}
                </td>
                <td className="px-5 py-3 text-ink-muted">
                  {s.last_attempt_at ? new Date(s.last_attempt_at).toLocaleDateString() : "Never"}
                </td>
                <td className="px-5 py-3">
                  {s.total_violations > 0 ? (
                    <span
                      className={cn(
                        "flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        s.total_violations >= 5 ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning",
                      )}
                    >
                      <ShieldAlert size={12} /> {s.total_violations}
                    </span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-muted">
                  No students match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { fetchAllStudentsProgress, fetchStudentAttempts } from "../../lib/progress";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { cn } from "../../lib/utils";

function scoreColor(pct: number) {
  if (pct >= 75) return "text-success";
  if (pct >= 50) return "text-warning";
  return "text-danger";
}

export function StudentDetail() {
  const { userId } = useParams<{ userId: string }>();
  const id = Number(userId);

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["all-students-progress"],
    queryFn: fetchAllStudentsProgress,
  });
  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ["student-attempts", id],
    queryFn: () => fetchStudentAttempts(id),
    enabled: !Number.isNaN(id),
  });

  const student = students?.find((s) => s.user_id === id);

  if (studentsLoading || attemptsLoading) return <Loader className="py-24" label="Loading student..." />;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/students" className="flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> All students
      </Link>

      {student && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{student.full_name}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {student.email} · Roll number: {student.roll_number ?? "—"}
            </p>
          </div>
          {student.total_violations > 0 && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                student.total_violations >= 5 ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning",
              )}
            >
              <ShieldAlert size={14} /> {student.total_violations} proctoring violation
              {student.total_violations === 1 ? "" : "s"} total
            </span>
          )}
        </div>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Exam</th>
              <th className="px-5 py-3 font-medium">Subject</th>
              <th className="px-5 py-3 font-medium">Score</th>
              <th className="px-5 py-3 font-medium">Submitted</th>
              <th className="px-5 py-3 font-medium">Violations</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {attempts?.map((a) => {
              const pct = a.max_score ? Math.round(((a.score ?? 0) / a.max_score) * 100) : 0;
              return (
                <tr key={a.attempt_id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{a.exam_title}</td>
                  <td className="px-5 py-3 text-ink-muted">{a.subject_name}</td>
                  <td className={`px-5 py-3 font-medium ${scoreColor(pct)}`}>
                    {a.score} / {a.max_score} ({pct}%)
                  </td>
                  <td className="px-5 py-3 text-ink-muted">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {a.violation_count > 0 ? (
                      <span
                        className={cn(
                          "flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          a.violation_count >= 3 ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning",
                        )}
                      >
                        <ShieldAlert size={12} /> {a.violation_count}
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      to={`/exams/attempts/${a.attempt_id}`}
                      className="text-sm text-accent-soft hover:underline"
                    >
                      View result
                    </Link>
                  </td>
                </tr>
              );
            })}
            {attempts?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-muted">
                  This student hasn't submitted any exam attempts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

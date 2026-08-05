import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Flag,
  GraduationCap,
  MessagesSquare,
  Target,
  Users,
} from "lucide-react";
import { fetchActivityLog, fetchPlatformStats } from "../../lib/admin";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
        <Icon size={18} />
      </div>
      <div>
        <p className="font-display text-2xl font-semibold text-ink">{value}</p>
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}

export function PlatformDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: fetchPlatformStats,
  });
  const { data: log, isLoading: logLoading } = useQuery({
    queryKey: ["activity-log"],
    queryFn: () => fetchActivityLog(60),
  });

  if (statsLoading) return <Loader className="py-24" label="Loading platform stats..." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Platform overview</h1>
        <p className="mt-1 text-sm text-ink-muted">Usage at a glance, and a log of recent admin actions.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Active students" value={`${stats?.active_students}/${stats?.total_students}`} />
        <StatTile icon={GraduationCap} label="Admins" value={stats?.total_admins ?? 0} />
        <StatTile icon={BookOpen} label="Subjects" value={stats?.total_subjects ?? 0} />
        <StatTile
          icon={Target}
          label="Published exams"
          value={`${stats?.published_exams}/${stats?.total_exams}`}
        />
        <StatTile icon={BarChart3} label="Submitted attempts" value={stats?.submitted_attempts ?? 0} />
        <StatTile icon={BarChart3} label="Average score" value={`${stats?.average_score_pct ?? 0}%`} />
        <StatTile
          icon={MessagesSquare}
          label="Discussion threads / posts"
          value={`${stats?.total_discussion_threads} / ${stats?.total_discussion_posts}`}
        />
        <StatTile icon={Flag} label="Question reports" value={stats?.open_question_reports ?? 0} />
      </div>

      {stats && stats.most_reported_questions.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-base font-semibold text-ink">Most-reported questions</h2>
          <div className="flex flex-col divide-y divide-black/5">
            {stats.most_reported_questions.map((q) => (
              <div key={q.question_id} className="flex items-center justify-between gap-4 py-2.5">
                <p className="truncate text-sm text-ink">{q.question_text}</p>
                <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                  {q.report_count} report{q.report_count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Recent admin activity</h2>
          <Link to="/admin/logs" className="text-xs font-medium text-accent-soft hover:underline">
            View all logs
          </Link>
        </div>
        {logLoading && <Loader className="py-8" label="Loading activity..." />}
        {!logLoading && log?.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-muted">No admin actions logged yet.</p>
        )}
        {!logLoading && log && log.length > 0 && (
          <div className="flex flex-col divide-y divide-black/5">
            {log.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink">
                    <span className="font-medium">{entry.admin_name ?? "System"}</span>{" "}
                    <span className="text-ink-muted">{entry.action.replace(/_/g, " ")}</span>{" "}
                    <span className="text-ink-faint">
                      ({entry.target_type}
                      {entry.target_id ? ` #${entry.target_id}` : ""})
                    </span>
                  </p>
                  {entry.detail && <p className="truncate text-xs text-ink-faint">{entry.detail}</p>}
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-ink-faint">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

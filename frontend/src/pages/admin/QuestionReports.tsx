import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { fetchQuestionReports } from "../../lib/exams";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";

const REASON_LABELS: Record<string, string> = {
  wrong_answer: "Wrong answer",
  unclear_wording: "Unclear wording",
  typo: "Typo / formatting",
  other: "Other",
};

export function QuestionReports() {
  const { data: reports, isLoading } = useQuery({ queryKey: ["question-reports"], queryFn: fetchQuestionReports });

  if (isLoading) return <Loader className="py-24" label="Loading reports..." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Question reports</h1>
        <p className="mt-1 text-sm text-ink-muted">Issues students have flagged on exam questions.</p>
      </div>

      {!reports || reports.length === 0 ? (
        <Card className="py-16 text-center text-sm text-ink-muted">No question reports yet.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-danger">
                    <Flag size={13} /> {REASON_LABELS[r.reason] ?? r.reason}
                  </span>
                  <p className="mt-1 font-medium text-ink">{r.question_text}</p>
                  <p className="text-xs text-ink-faint">
                    {r.exam_title} · reported by {r.reported_by} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-black/10 bg-base-soft/40 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Student's answer</p>
                  <p className="mt-1 text-sm text-ink">{r.your_answer ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-black/10 bg-success/5 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Marked correct answer</p>
                  <p className="mt-1 text-sm text-ink">{r.correct_answer ?? "—"}</p>
                </div>
              </div>

              {r.comment && (
                <div className="rounded-lg border border-black/10 bg-base-soft/40 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Student's note</p>
                  <p className="mt-1 text-sm text-ink">{r.comment}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

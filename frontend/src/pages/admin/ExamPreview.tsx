import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { fetchExamForAdmin } from "../../lib/exams";
import type { QuestionAdmin } from "../../types/api";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { cn } from "../../lib/utils";

const TYPE_LABELS: Record<QuestionAdmin["type"], string> = {
  mcq: "Single choice",
  maq: "Multiple choice",
  match: "Match the following",
  fill_blank: "Fill in the blank",
  coding: "Coding",
};

function QuestionPreview({ question, index }: { question: QuestionAdmin; index: number }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent-soft">
            {index + 1}
          </span>
          <p className="text-sm font-medium text-ink">{question.question_text}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-ink-faint">
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent-soft">{TYPE_LABELS[question.type]}</span>
          <span>{question.points} pt{question.points === 1 ? "" : "s"}</span>
        </div>
      </div>

      {(question.type === "mcq" || question.type === "maq") && (
        <div className="flex flex-col gap-1.5 pl-8">
          {question.options.map((opt) => (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                opt.is_correct ? "border-success/40 bg-success/10 text-ink" : "border-black/10 text-ink-muted",
              )}
            >
              {opt.is_correct && <CheckCircle2 size={14} className="shrink-0 text-success" />}
              {opt.option_text}
            </div>
          ))}
        </div>
      )}

      {question.type === "match" && (
        <div className="flex flex-col gap-1.5 pl-8">
          {question.match_pairs.map((pair) => (
            <div key={pair.id} className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 text-sm">
              <span className="flex-1 text-ink">{pair.left_text}</span>
              <span className="text-ink-faint">&rarr;</span>
              <span className="flex-1 text-ink">{pair.right_text}</span>
            </div>
          ))}
        </div>
      )}

      {question.type === "fill_blank" && (
        <div className="flex flex-col gap-1.5 pl-8">
          {question.fill_blank_answers.map((blank) => (
            <div key={blank.id} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
              <span className="text-ink-faint">Blank {blank.blank_index + 1} accepts: </span>
              <span className="text-ink">{blank.accepted_answers.join(", ")}</span>
            </div>
          ))}
        </div>
      )}

      {question.type === "coding" && (
        <div className="flex flex-col gap-2 pl-8">
          {question.languages && question.languages.length > 0 && (
            <p className="text-xs text-ink-faint">Languages: {question.languages.join(", ")}</p>
          )}
          {question.test_cases.map((tc) => (
            <div key={tc.id} className="rounded-lg border border-black/10 p-3 text-xs">
              <p className="text-ink-faint">
                {tc.is_sample ? "Sample" : "Hidden"} test &middot; input:{" "}
                <span className="font-mono text-ink">{tc.input || "(none)"}</span>
              </p>
              <p className="text-ink-faint">
                expected: <span className="font-mono text-ink">{tc.expected_output}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ExamPreview() {
  const { id } = useParams<{ id: string }>();
  const examId = Number(id);

  const { data: exam, isLoading } = useQuery({
    queryKey: ["exam-preview", examId],
    queryFn: () => fetchExamForAdmin(examId),
    enabled: !Number.isNaN(examId),
  });

  if (isLoading) return <Loader className="py-24" label="Loading exam..." />;
  if (!exam) return <Card className="py-16 text-center text-sm text-ink-muted">Exam not found.</Card>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link to="/admin/subjects" className="flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to subjects &amp; exams
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{exam.title}</h1>
        {exam.description && <p className="mt-1 text-sm text-ink-muted">{exam.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
          <span className="flex items-center gap-1">
            <HelpCircle size={13} /> {exam.questions.length} questions
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} /> {exam.duration_minutes} min
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5",
              exam.is_published ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
            )}
          >
            {exam.is_published ? "Published" : "Draft"}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Preview only — correct answers are shown here for review; students never see them before submitting.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {exam.questions
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((q, i) => (
            <QuestionPreview key={q.id} question={q} index={i} />
          ))}
      </div>
    </div>
  );
}

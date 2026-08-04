import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, ListChecks, Percent, Star, XCircle } from "lucide-react";
import { fetchAttempt, fetchExamFeedback, fetchExamForStudent, submitExamFeedback } from "../lib/exams";
import type { AttemptAnswerResult, CodingAnswer, CodingGradedDetail, QuestionSafe } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { FullPageLoader } from "../components/ui/Loader";
import { cn } from "../lib/utils";
import { ProctorSummaryCard } from "../components/exam-take/ProctorSummaryCard";

const DIFFICULTY_OPTIONS: { value: string; label: string }[] = [
  { value: "too_easy", label: "Too easy" },
  { value: "just_right", label: "Just right" },
  { value: "too_hard", label: "Too hard" },
];

function ExamFeedbackCard({ attemptId }: { attemptId: number }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const { data: feedback, isLoading } = useQuery({
    queryKey: ["exam-feedback", attemptId],
    queryFn: () => fetchExamFeedback(attemptId),
  });

  const mutation = useMutation({
    mutationFn: () => submitExamFeedback(attemptId, { rating, difficulty, comment: comment.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-feedback", attemptId] });
    },
  });

  if (isLoading) return null;

  if (feedback) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="font-display text-base font-semibold text-ink">Thanks for your feedback</h2>
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={18}
              className={n <= feedback.rating ? "fill-warning text-warning" : "text-black/15"}
            />
          ))}
        </div>
        {feedback.comment && <p className="text-sm text-ink-muted">"{feedback.comment}"</p>}
      </Card>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-base font-semibold text-ink">Rate this exam</h2>
        <p className="mt-1 text-sm text-ink-muted">Help us improve — this doesn't affect your score.</p>
      </div>

      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <Star
              size={26}
              className={cn(
                "transition-colors",
                n <= displayRating ? "fill-warning text-warning" : "text-black/15",
              )}
            />
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {DIFFICULTY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDifficulty(opt.value === difficulty ? null : opt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              difficulty === opt.value
                ? "border-accent bg-accent/10 text-ink"
                : "border-black/10 text-ink-muted hover:bg-black/5",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Any comments? (optional)"
        rows={2}
        className="w-full rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-sm text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      />

      <Button
        onClick={() => mutation.mutate()}
        disabled={rating === 0}
        isLoading={mutation.isPending}
        className="w-fit"
      >
        Submit feedback
      </Button>
    </Card>
  );
}

function describeAnswer(question: QuestionSafe, payload: Record<string, unknown>): string {
  if (!payload || Object.keys(payload).length === 0) return "No answer";

  if (question.type === "mcq") {
    const id = (payload as { selected_option_id?: number }).selected_option_id;
    return question.options.find((o) => o.id === id)?.option_text ?? "No answer";
  }
  if (question.type === "maq") {
    const ids = (payload as { selected_option_ids?: number[] }).selected_option_ids ?? [];
    const labels = question.options.filter((o) => ids.includes(o.id)).map((o) => o.option_text);
    return labels.length ? labels.join(", ") : "No answer";
  }
  if (question.type === "match") {
    const pairs = (payload as { pairs?: Record<string, number> }).pairs ?? {};
    const parts = question.match_left.map((left) => {
      const rightId = pairs[String(left.id)];
      const right = question.match_right.find((r) => r.id === rightId);
      return `${left.text} → ${right?.text ?? "?"}`;
    });
    return parts.join(", ");
  }
  const blanks = (payload as { blanks?: Record<string, string | string[]> }).blanks ?? {};
  const value = blanks["0"];
  return Array.isArray(value) ? value.join(" / ") : value || "No answer";
}

export function ExamResult() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const id = Number(attemptId);

  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey: ["attempt", id],
    queryFn: () => fetchAttempt(id),
    enabled: !Number.isNaN(id),
  });

  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ["exam-take", attempt?.exam_id],
    queryFn: () => fetchExamForStudent(attempt!.exam_id),
    enabled: !!attempt,
  });

  const { data: feedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ["exam-feedback", attempt?.id],
    queryFn: () => fetchExamFeedback(attempt!.id),
    enabled: !!attempt,
  });

  if (attemptLoading || examLoading || feedbackLoading || !attempt || !exam) {
    return <FullPageLoader label="Loading results..." />;
  }

  if (!feedback) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{exam.title} — Results</h1>
          <p className="mt-1 text-sm text-ink-muted">Rate this exam to unlock your results.</p>
        </div>
        <ExamFeedbackCard attemptId={attempt.id} />
      </div>
    );
  }

  const pct = attempt.max_score ? Math.round(((attempt.score ?? 0) / attempt.max_score) * 100) : 0;
  const questionsById = new Map(exam.questions.map((q) => [q.id, q]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{exam.title} — Results</h1>
        <p className="mt-1 text-sm text-ink-muted">Submitted {new Date(attempt.submitted_at!).toLocaleString()}</p>
      </div>

      <Card className="flex items-center gap-4 sm:gap-6">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-black/10 sm:h-24 sm:w-24">
          <div
            className="absolute inset-0 rounded-full border-4 border-accent"
            style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
          />
          <span className="font-display text-lg font-bold text-ink sm:text-xl">{pct}%</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl font-semibold text-ink">
            {attempt.score} / {attempt.max_score} points
          </p>
          <p className="text-sm text-ink-muted">
            {attempt.answers.filter((a: AttemptAnswerResult) => a.is_correct).length} of {attempt.answers.length}{" "}
            questions fully correct
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="flex items-center gap-2 p-3 sm:gap-3 sm:p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold text-ink">
              {attempt.answers.filter((a: AttemptAnswerResult) => a.is_correct).length}
            </p>
            <p className="truncate text-xs text-ink-muted">Correct</p>
          </div>
        </Card>
        <Card className="flex items-center gap-2 p-3 sm:gap-3 sm:p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <XCircle size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold text-ink">
              {attempt.answers.filter((a: AttemptAnswerResult) => !a.is_correct).length}
            </p>
            <p className="truncate text-xs text-ink-muted">Incorrect</p>
          </div>
        </Card>
        <Card className="flex items-center gap-2 p-3 sm:gap-3 sm:p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
            <Percent size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold text-ink">{pct}%</p>
            <p className="truncate text-xs text-ink-muted">Score</p>
          </div>
        </Card>
      </div>

      <ProctorSummaryCard attemptId={attempt.id} />

      <ExamFeedbackCard attemptId={attempt.id} />

      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <ListChecks size={15} /> Question breakdown
      </div>

      <div className="flex flex-col gap-3">
        {attempt.answers.map((answer: AttemptAnswerResult) => {
          const question = questionsById.get(answer.question_id);
          if (!question) return null;

          if (question.type === "coding") {
            const submitted = answer.submitted_answer as Partial<CodingAnswer>;
            const detail = answer.correct_answer as Partial<CodingGradedDetail>;
            const testCaseResults = detail.test_case_results ?? [];
            return (
              <Card key={answer.question_id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink">{question.question_text}</p>
                  {answer.is_correct ? (
                    <CheckCircle2 size={20} className="shrink-0 text-success" />
                  ) : (
                    <XCircle size={20} className="shrink-0 text-danger" />
                  )}
                </div>
                <p className="text-xs text-ink-muted">
                  {detail.passed_count ?? 0} / {detail.total_count ?? 0} test cases passed · Language:{" "}
                  {submitted.language ?? "—"}
                </p>
                {submitted.code && (
                  <pre className="overflow-x-auto rounded-lg border border-black/10 bg-base-soft/60 p-3 font-mono text-xs text-ink">
                    {submitted.code}
                  </pre>
                )}
                <div className="flex flex-col gap-2">
                  {testCaseResults.map((tc, i) => (
                    <div key={i} className="flex flex-col gap-1 rounded-lg border border-black/10 p-3 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        {tc.passed ? (
                          <CheckCircle2 size={13} className="text-success" />
                        ) : (
                          <XCircle size={13} className="text-danger" />
                        )}
                        <span className="font-body font-medium text-ink">Test case {i + 1}</span>
                      </div>
                      <p className="text-ink-muted">
                        Input: <span className="text-ink">{tc.input || "(none)"}</span>
                      </p>
                      <p className="text-ink-muted">
                        Expected: <span className="text-ink">{tc.expected_output}</span>
                      </p>
                      <p className="text-ink-muted">
                        Your output:{" "}
                        <span className={tc.passed ? "text-success" : "text-danger"}>{tc.actual_output || "(empty)"}</span>
                      </p>
                      {tc.error && <p className="text-danger">{tc.error}</p>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink-faint">
                  {answer.points_awarded} / {question.points} points
                </p>
              </Card>
            );
          }

          return (
            <Card key={answer.question_id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-ink">{question.question_text}</p>
                {answer.is_correct ? (
                  <CheckCircle2 size={20} className="shrink-0 text-success" />
                ) : (
                  <XCircle size={20} className="shrink-0 text-danger" />
                )}
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <p className={cn("text-ink-muted", !answer.is_correct && "text-danger")}>
                  Your answer: {describeAnswer(question, answer.submitted_answer)}
                </p>
                {!answer.is_correct && (
                  <p className="text-success">Correct answer: {describeAnswer(question, answer.correct_answer)}</p>
                )}
              </div>
              <p className="text-xs text-ink-faint">
                {answer.points_awarded} / {question.points} points
              </p>
            </Card>
          );
        })}
      </div>

      <Link to={`/subjects/${exam.subject_id}`}>
        <Button variant="outline">Back to subject</Button>
      </Link>
    </div>
  );
}

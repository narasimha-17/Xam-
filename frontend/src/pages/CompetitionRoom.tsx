import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Crown, Medal, Swords, Timer, Trophy } from "lucide-react";
import {
  answerCompetitionQuestion,
  fetchCompetitionState,
  nextCompetitionQuestion,
  startCompetition,
} from "../lib/competitions";
import type { CompetitionAnswerResult, CompetitionParticipant } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { FullPageLoader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

function Leaderboard({ participants }: { participants: CompetitionParticipant[] }) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-faint">Leaderboard</h2>
      <div className="flex flex-col divide-y divide-black/5">
        {sorted.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-ink">
              {i === 0 ? (
                <Crown size={14} className="shrink-0 text-warning" />
              ) : i < 3 ? (
                <Medal size={14} className="shrink-0 text-ink-faint" />
              ) : (
                <span className="w-3.5 shrink-0 text-center text-xs text-ink-faint">{i + 1}</span>
              )}
              <span className="truncate">{p.full_name}</span>
            </span>
            <span className="shrink-0 font-display font-semibold text-ink">{p.score}</span>
          </div>
        ))}
        {sorted.length === 0 && <p className="py-4 text-center text-sm text-ink-muted">No participants yet.</p>}
      </div>
    </Card>
  );
}

export function CompetitionRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const id = Number(roomId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<CompetitionAnswerResult | null>(null);
  const [now, setNow] = useState(Date.now());

  const { data: state, isLoading } = useQuery({
    queryKey: ["competition", id],
    queryFn: () => fetchCompetitionState(id),
    enabled: !Number.isNaN(id),
    refetchInterval: 1500,
  });

  useEffect(() => {
    setSelectedOption(null);
    setAnswerResult(null);
  }, [state?.current_question_index]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  const startMutation = useMutation({
    mutationFn: () => startCompetition(id),
    onSuccess: (data) => queryClient.setQueryData(["competition", id], data),
  });
  const nextMutation = useMutation({
    mutationFn: () => nextCompetitionQuestion(id),
    onSuccess: (data) => queryClient.setQueryData(["competition", id], data),
  });
  const answerMutation = useMutation({
    mutationFn: (optionId: number) => answerCompetitionQuestion(id, state!.current_question!.id, optionId),
    onSuccess: (result) => {
      setAnswerResult(result);
      queryClient.invalidateQueries({ queryKey: ["competition", id] });
    },
  });

  if (isLoading || !state) return <FullPageLoader label="Loading competition..." />;

  const remainingSeconds = (() => {
    if (!state.question_started_at) return state.time_limit_seconds;
    const elapsed = (now - new Date(state.question_started_at).getTime()) / 1000;
    return Math.max(0, Math.ceil(state.time_limit_seconds - elapsed));
  })();
  const timeUp = remainingSeconds <= 0;
  const alreadyAnswered = state.has_answered_current || answerResult !== null;
  const isLast = state.current_question_index === state.total_questions - 1;

  function handleAnswer(optionId: number) {
    if (alreadyAnswered || timeUp) return;
    setSelectedOption(optionId);
    answerMutation.mutate(optionId);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate font-display text-xl font-semibold text-ink">
            <Swords size={22} className="shrink-0 text-accent-soft" /> {state.exam_title}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Room code: <span className="font-mono font-semibold tracking-widest text-ink">{state.code}</span>
          </p>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(state.code)}
          className="flex w-fit shrink-0 items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm text-ink-muted hover:bg-black/5"
        >
          <Copy size={14} /> Copy code
        </button>
      </div>

      {state.status === "waiting" && (
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="font-display text-4xl font-bold tracking-[0.3em] text-ink">{state.code}</p>
          <p className="text-sm text-ink-muted">
            {state.is_host ? "Share this code — students join, then you start." : "Waiting for the host to start..."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {state.participants.map((p) => (
              <span key={p.id} className="rounded-full bg-accent/10 px-3 py-1.5 text-sm font-medium text-ink">
                {p.full_name}
              </span>
            ))}
            {state.participants.length === 0 && <p className="text-sm text-ink-faint">No one has joined yet.</p>}
          </div>
          {state.is_host && (
            <Button onClick={() => startMutation.mutate()} isLoading={startMutation.isPending} className="mt-2">
              Start competition
            </Button>
          )}
        </Card>
      )}

      {state.status === "active" && state.current_question && (
        <>
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-ink-faint">
              <span>
                Question {state.current_question_index + 1} of {state.total_questions}
              </span>
              <span className={cn("flex items-center gap-1.5", remainingSeconds <= 5 && "text-danger")}>
                <Timer size={13} /> {remainingSeconds}s
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  remainingSeconds <= 5 ? "bg-danger" : "bg-accent",
                )}
                style={{ width: `${(remainingSeconds / state.time_limit_seconds) * 100}%` }}
              />
            </div>
            <p className="text-base font-medium text-ink">{state.current_question.question_text}</p>

            {!state.is_host && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {state.current_question.options.map((opt) => {
                  const isPicked = selectedOption === opt.id;
                  const isCorrectAnswer = answerResult && opt.id === answerResult.correct_option_id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(opt.id)}
                      disabled={alreadyAnswered || timeUp}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed",
                        answerResult
                          ? isCorrectAnswer
                            ? "border-success/40 bg-success/10 text-success"
                            : isPicked
                              ? "border-danger/40 bg-danger/10 text-danger"
                              : "border-black/10 text-ink-faint"
                          : isPicked
                            ? "border-accent bg-accent/10 text-ink"
                            : "border-black/10 text-ink hover:bg-black/5",
                      )}
                    >
                      {opt.option_text}
                    </button>
                  );
                })}
              </div>
            )}

            {!state.is_host && alreadyAnswered && !answerResult && (
              <p className="text-center text-sm text-ink-muted">
                Answer locked in — waiting for the next question...
              </p>
            )}
            {!state.is_host && answerResult && (
              <p
                className={cn(
                  "text-center text-sm font-medium",
                  answerResult.is_correct ? "text-success" : "text-danger",
                )}
              >
                {answerResult.is_correct
                  ? `Correct! +${answerResult.points_awarded} points`
                  : "Not quite — waiting for the next question..."}
              </p>
            )}
            {!state.is_host && timeUp && !alreadyAnswered && (
              <p className="text-center text-sm text-danger">Time's up! Waiting for the next question...</p>
            )}

            {state.is_host && (
              <div className="flex flex-col gap-3 rounded-xl bg-base-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">
                  <span className="font-semibold text-ink">{state.answered_count}</span> /{" "}
                  {state.participants.length} answered
                </p>
                <Button onClick={() => nextMutation.mutate()} isLoading={nextMutation.isPending} className="w-fit">
                  {isLast ? "Show final results" : "Next question"}
                </Button>
              </div>
            )}
          </Card>

          <Leaderboard participants={state.participants} />
        </>
      )}

      {state.status === "finished" && (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Trophy size={32} className="text-warning" />
            <h2 className="font-display text-xl font-semibold text-ink">Competition finished</h2>
          </div>
          <Leaderboard participants={state.participants} />
          <Button variant="outline" onClick={() => navigate("/competitions")} className="w-fit self-center">
            Back to competitions
          </Button>
        </Card>
      )}
    </div>
  );
}

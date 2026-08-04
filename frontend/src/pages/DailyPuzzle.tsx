import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Flame, Lightbulb, Puzzle as PuzzleIcon, XCircle } from "lucide-react";
import { attemptTodayPuzzle, fetchPuzzleStreak, fetchTodayPuzzle } from "../lib/puzzles";
import type { PuzzleTodayItem } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { FullPageLoader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

function PuzzleCard({ puzzle, index }: { puzzle: PuzzleTodayItem; index: number }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);

  const attemptMutation = useMutation({
    mutationFn: (optionIndex: number) => attemptTodayPuzzle(puzzle.id, optionIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["puzzle-today"] });
      queryClient.invalidateQueries({ queryKey: ["puzzle-streak"] });
    },
  });

  const solved = puzzle.already_solved;
  const revealIndex = solved ? puzzle.correct_index : null;
  const pickedIndex = solved ? puzzle.selected_index : selected;

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-xs font-semibold text-ink-muted">
            {index + 1}
          </span>
          <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium capitalize text-ink-faint">
            {puzzle.difficulty}
          </span>
        </div>
        {solved && (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              puzzle.is_correct ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
            )}
          >
            {puzzle.is_correct ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {puzzle.is_correct ? "Correct" : "Not quite"}
          </span>
        )}
      </div>

      <p className="text-base font-medium text-ink">{puzzle.question_text}</p>

      <div className="flex flex-col gap-2">
        {puzzle.options.map((option, i) => {
          const isPicked = pickedIndex === i;
          const isCorrectOption = revealIndex === i;
          return (
            <button
              key={i}
              disabled={solved}
              onClick={() => setSelected(i)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                solved
                  ? isCorrectOption
                    ? "border-success/40 bg-success/10 text-success"
                    : isPicked
                      ? "border-danger/40 bg-danger/10 text-danger"
                      : "border-black/10 text-ink-muted"
                  : isPicked
                    ? "border-accent bg-accent/10 text-ink"
                    : "border-black/10 text-ink hover:bg-black/5",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                  isPicked || isCorrectOption ? "border-current" : "border-black/20 text-ink-faint",
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {!solved && (
        <Button
          onClick={() => selected !== null && attemptMutation.mutate(selected)}
          disabled={selected === null}
          isLoading={attemptMutation.isPending}
          className="w-full"
        >
          Submit answer
        </Button>
      )}

      {solved && puzzle.explanation && (
        <div className="flex gap-2.5 rounded-xl border border-black/10 bg-base-soft/40 p-4 text-sm text-ink-muted">
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent-soft" />
          <p>{puzzle.explanation}</p>
        </div>
      )}
    </Card>
  );
}

export function DailyPuzzle() {
  const { data: today, isLoading, isError } = useQuery({
    queryKey: ["puzzle-today"],
    queryFn: fetchTodayPuzzle,
    retry: false,
  });
  const { data: streak } = useQuery({
    queryKey: ["puzzle-streak"],
    queryFn: fetchPuzzleStreak,
  });

  if (isLoading) {
    return <FullPageLoader label="Loading today's puzzles..." />;
  }

  if (isError || !today || today.puzzles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
            <PuzzleIcon size={22} />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No puzzles available yet</h3>
          <p className="max-w-xs text-sm text-ink-muted">
            Check back soon — new puzzles are added regularly.
          </p>
        </Card>
      </div>
    );
  }

  const allSolvedToday = today.solved_count >= today.required_count;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <PuzzleIcon size={24} className="text-accent-soft" /> Daily puzzles
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Solve all {today.required_count} to keep your streak alive today.
          </p>
        </div>
        {streak && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 px-4 py-2.5">
            <Flame size={18} className="text-warning" />
            <div className="text-sm">
              <div className="font-display text-lg font-semibold leading-none text-ink">
                {streak.current_streak}
              </div>
              <div className="text-xs text-ink-muted">day streak</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-base-soft/40 p-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10">
          <div
            className={cn("h-full rounded-full transition-all", allSolvedToday ? "bg-success" : "bg-accent")}
            style={{ width: `${(today.solved_count / today.required_count) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-medium text-ink">
          {today.solved_count} / {today.required_count} solved today
        </span>
      </div>

      {allSolvedToday && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <CheckCircle2 size={16} /> All done for today — your streak is safe. Come back tomorrow for a new set.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {today.puzzles.map((puzzle, i) => (
          <PuzzleCard key={puzzle.id} puzzle={puzzle} index={i} />
        ))}
      </div>

      {streak && streak.total_solved > 0 && (
        <div className="flex items-center justify-center gap-6 text-sm text-ink-muted">
          <span>
            Longest streak: <span className="font-medium text-ink">{streak.longest_streak}</span>
          </span>
          <span>
            Solved: <span className="font-medium text-ink">{streak.total_solved}</span>
          </span>
          <span>
            Correct: <span className="font-medium text-ink">{streak.total_correct}</span>
          </span>
        </div>
      )}
    </div>
  );
}

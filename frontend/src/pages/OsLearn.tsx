import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Cpu, Lightbulb, Lock, RotateCcw, Terminal, Trophy } from "lucide-react";
import { OS_LEVELS, buildOsScenario } from "../lib/osLevels";
import { runShellCommand, type OsState } from "../lib/osSim";
import { completeOsLevel, fetchOsProgress } from "../lib/osLearnApi";
import { OsFileTreeViz } from "../components/os/OsFileTreeViz";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { FullPageLoader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

interface LogEntry {
  command: string;
  output: string;
  error: boolean;
}

function tierFor(xp: number): { label: string; color: string } {
  if (xp >= 100) return { label: "Shell Master", color: "text-accent" };
  if (xp >= 65) return { label: "Gold", color: "text-warning" };
  if (xp >= 30) return { label: "Silver", color: "text-ink-muted" };
  return { label: "Bronze", color: "text-accent-dim" };
}

export function OsLearn() {
  const queryClient = useQueryClient();
  const { data: progress, isLoading } = useQuery({
    queryKey: ["os-progress"],
    queryFn: fetchOsProgress,
  });

  const [levelIndex, setLevelIndex] = useState(0);
  const [hasPickedStart, setHasPickedStart] = useState(false);
  const [osState, setOsState] = useState<OsState>(() => buildOsScenario(OS_LEVELS[0].setup));
  const [log, setLog] = useState<LogEntry[]>([]);
  const [input, setInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const completed = new Set(progress?.completed_level_ids ?? []);
  const level = OS_LEVELS[levelIndex];

  useEffect(() => {
    if (!progress || hasPickedStart) return;
    const firstIncomplete = OS_LEVELS.findIndex((l) => !completed.has(l.id));
    setLevelIndex(firstIncomplete === -1 ? OS_LEVELS.length - 1 : firstIncomplete);
    setHasPickedStart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  useEffect(() => {
    setOsState(buildOsScenario(level.setup));
    setLog([]);
    setShowHint(false);
    setJustCompleted(false);
  }, [level]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const completeMutation = useMutation({
    mutationFn: () => completeOsLevel(level.id, level.xp),
    onSuccess: (data) => {
      queryClient.setQueryData(["os-progress"], data);
    },
  });

  function isUnlocked(index: number): boolean {
    if (index === 0) return true;
    return completed.has(OS_LEVELS[index - 1].id) || completed.has(OS_LEVELS[index].id);
  }

  function runInput() {
    const cmd = input.trim();
    if (!cmd) return;
    const result = runShellCommand(osState, cmd);
    setLog((prev) => [...prev, { command: cmd, output: result.output, error: result.error }]);
    setOsState(result.state);
    setInput("");

    if (!result.error && level.check(result.state, result)) {
      setJustCompleted(true);
      if (!completed.has(level.id)) {
        completeMutation.mutate();
      }
    }
  }

  function resetLevel() {
    setOsState(buildOsScenario(level.setup));
    setLog([]);
    setJustCompleted(false);
  }

  if (isLoading) return <FullPageLoader label="Loading..." />;

  const alreadyDone = completed.has(level.id);
  const tier = tierFor(progress?.total_xp ?? 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <Cpu size={24} className="text-accent-soft" /> OS &amp; shell practice
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Type real shell commands against a simulated filesystem and watch the file tree update live.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-accent/20 bg-accent/10 px-4 py-2.5">
          <Trophy size={18} className={tier.color} />
          <div className="text-sm">
            <div className="font-display text-lg font-semibold leading-none text-ink">{progress?.total_xp ?? 0} XP</div>
            <div className="text-xs text-ink-muted">{tier.label}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Card className="flex w-full shrink-0 flex-col gap-1 p-3 lg:w-64">
          {OS_LEVELS.map((l, i) => {
            const unlocked = isUnlocked(i);
            const done = completed.has(l.id);
            const active = i === levelIndex;
            return (
              <button
                key={l.id}
                disabled={!unlocked}
                onClick={() => unlocked && setLevelIndex(i)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  active ? "bg-accent/10 text-ink shadow-glow" : "text-ink-muted hover:bg-black/5",
                  !unlocked && "cursor-not-allowed opacity-50",
                )}
              >
                {done ? (
                  <CheckCircle2 size={16} className="shrink-0 text-success" />
                ) : unlocked ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-black/20 text-[10px] text-ink-faint">
                    {i + 1}
                  </span>
                ) : (
                  <Lock size={14} className="shrink-0 text-ink-faint" />
                )}
                <span className="truncate font-medium">{l.title}</span>
              </button>
            );
          })}
        </Card>

        <div className="flex flex-1 flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Level {levelIndex + 1} of {OS_LEVELS.length} &middot; {level.xp} XP
                </p>
                <h2 className="mt-1 font-display text-lg font-semibold text-ink">{level.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{level.goal}</p>
              </div>
              {alreadyDone && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                  <CheckCircle2 size={13} /> Complete
                </span>
              )}
            </div>

            {showHint && (
              <div className="flex gap-2.5 rounded-xl border border-black/10 bg-base-soft/40 p-3 text-sm text-ink-muted">
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent-soft" />
                <p className="font-mono text-xs">{level.hint}</p>
              </div>
            )}

            {justCompleted && (
              <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
                <CheckCircle2 size={16} /> Level complete{!alreadyDone ? ` — +${level.xp} XP` : ""}! Pick the next level from the list.
              </div>
            )}

            <OsFileTreeViz state={osState} />

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowHint((s) => !s)} className="text-xs">
                <Lightbulb size={14} /> {showHint ? "Hide hint" : "Show hint"}
              </Button>
              <Button variant="ghost" onClick={resetLevel} className="text-xs">
                <RotateCcw size={14} /> Reset level
              </Button>
            </div>
          </Card>

          <div className="flex flex-col gap-2 rounded-2xl bg-ink p-4 shadow-glow">
            <div className="flex items-center gap-2 text-xs font-medium text-base/70">
              <Terminal size={14} /> Terminal
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-base">
              {log.length === 0 && <p className="text-base/40">Type a shell command below and press Enter.</p>}
              {log.map((entry, i) => (
                <div key={i} className="mb-2">
                  <p className="text-accent-soft">$ {entry.command}</p>
                  {entry.output && (
                    <p className={cn("whitespace-pre-wrap", entry.error ? "text-danger" : "text-base/80")}>
                      {entry.output}
                    </p>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-accent-soft">$</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runInput()}
                placeholder="ls, cd, mkdir, ..."
                spellCheck={false}
                autoCapitalize="off"
                className="flex-1 bg-transparent font-mono text-sm text-base outline-none placeholder:text-base/30"
              />
              <Button
                variant="outline"
                onClick={runInput}
                className="border-base/20 py-1.5 text-xs !text-base hover:bg-white/10"
              >
                Run
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "sql.js";
import { CheckCircle2, Database as DatabaseIcon, Lightbulb, Lock, Play, RotateCcw, Trophy } from "lucide-react";
import { SQL_LEVELS, SCHEMA_SETUP } from "../lib/sqlLevels";
import { loadSqlJs, buildDatabase, runQuery, type QueryResult } from "../lib/sqlEngine";
import { completeSqlLevel, fetchSqlProgress } from "../lib/sqlLearnApi";
import { SqlSchemaViz } from "../components/sql/SqlSchemaViz";
import { SqlResultTable } from "../components/sql/SqlResultTable";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { FullPageLoader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

function tierFor(xp: number): { label: string; color: string } {
  if (xp >= 145) return { label: "SQL Architect", color: "text-accent" };
  if (xp >= 90) return { label: "Gold", color: "text-warning" };
  if (xp >= 40) return { label: "Silver", color: "text-ink-muted" };
  return { label: "Bronze", color: "text-accent-dim" };
}

export function SqlLearn() {
  const queryClient = useQueryClient();
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["sql-progress"],
    queryFn: fetchSqlProgress,
  });

  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const dbRef = useRef<Database | null>(null);

  const [levelIndex, setLevelIndex] = useState(0);
  const [hasPickedStart, setHasPickedStart] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const completed = new Set(progress?.completed_level_ids ?? []);
  const level = SQL_LEVELS[levelIndex];

  useEffect(() => {
    let cancelled = false;
    loadSqlJs()
      .then((SQL) => {
        if (cancelled) return;
        dbRef.current = buildDatabase(SQL, SCHEMA_SETUP);
        setEngineReady(true);
      })
      .catch((e) => setEngineError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!progress || hasPickedStart) return;
    const firstIncomplete = SQL_LEVELS.findIndex((l) => !completed.has(l.id));
    setLevelIndex(firstIncomplete === -1 ? SQL_LEVELS.length - 1 : firstIncomplete);
    setHasPickedStart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  useEffect(() => {
    if (!engineReady) return;
    loadSqlJs().then((SQL) => {
      dbRef.current = buildDatabase(SQL, SCHEMA_SETUP);
    });
    setQuery("");
    setResult(null);
    setShowHint(false);
    setJustCompleted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const completeMutation = useMutation({
    mutationFn: () => completeSqlLevel(level.id, level.xp),
    onSuccess: (data) => {
      queryClient.setQueryData(["sql-progress"], data);
    },
  });

  function isUnlocked(index: number): boolean {
    if (index === 0) return true;
    return completed.has(SQL_LEVELS[index - 1].id) || completed.has(SQL_LEVELS[index].id);
  }

  function runCurrentQuery() {
    const db = dbRef.current;
    if (!db || !query.trim()) return;
    const res = runQuery(db, query);
    setResult(res);

    if (!res.error && level.check(db, res)) {
      setJustCompleted(true);
      if (!completed.has(level.id)) {
        completeMutation.mutate();
      }
    }
  }

  function resetLevel() {
    loadSqlJs().then((SQL) => {
      dbRef.current = buildDatabase(SQL, SCHEMA_SETUP);
    });
    setQuery("");
    setResult(null);
    setJustCompleted(false);
  }

  if (progressLoading || (!engineReady && !engineError)) {
    return <FullPageLoader label="Loading SQL engine..." />;
  }

  if (engineError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <h3 className="font-display text-lg font-semibold text-ink">Could not load the SQL engine</h3>
          <p className="max-w-sm text-sm text-ink-muted">{engineError}</p>
        </Card>
      </div>
    );
  }

  const alreadyDone = completed.has(level.id);
  const tier = tierFor(progress?.total_xp ?? 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <DatabaseIcon size={24} className="text-accent-soft" /> SQL practice
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Write real SQL against a live in-browser database and see the results instantly.
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
          {SQL_LEVELS.map((l, i) => {
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
                  Level {levelIndex + 1} of {SQL_LEVELS.length} &middot; {level.xp} XP
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

            <SqlSchemaViz />

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowHint((s) => !s)} className="text-xs">
                <Lightbulb size={14} /> {showHint ? "Hide hint" : "Show hint"}
              </Button>
              <Button variant="ghost" onClick={resetLevel} className="text-xs">
                <RotateCcw size={14} /> Reset level
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runCurrentQuery();
              }}
              placeholder="SELECT * FROM students;"
              rows={4}
              spellCheck={false}
              className="w-full rounded-xl border border-black/10 bg-base-soft/60 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
            <div className="flex items-center gap-2">
              <Button onClick={runCurrentQuery} disabled={!query.trim()} className="w-fit">
                <Play size={15} /> Run query
              </Button>
              <span className="text-xs text-ink-faint">or press Ctrl/Cmd + Enter</span>
            </div>
            <SqlResultTable result={result} />
          </Card>
        </div>
      </div>
    </div>
  );
}

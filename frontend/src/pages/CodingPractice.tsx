import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Code2 } from "lucide-react";
import { fetchCodingProblems, fetchCodingStatus } from "../lib/codingProblems";
import { Card } from "../components/ui/Card";
import { ComingSoon } from "../components/ui/ComingSoon";
import { Loader } from "../components/ui/Loader";
import { SearchInput } from "../components/ui/SearchInput";
import { cn } from "../lib/utils";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  hard: "bg-danger/15 text-danger",
};

export function CodingPractice() {
  const [search, setSearch] = useState("");
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["coding-status"],
    queryFn: fetchCodingStatus,
    staleTime: 5 * 60_000,
  });
  const { data: problems, isLoading } = useQuery({
    queryKey: ["coding-problems"],
    queryFn: fetchCodingProblems,
    enabled: status?.enabled !== false,
  });

  const filtered = problems?.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
  });

  const solvedCount = problems?.filter((p) => p.is_solved).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <Code2 size={24} className="text-accent-soft" /> Coding practice
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Standalone coding problems — write, run, and submit code outside of any timed exam.
          </p>
        </div>
        {problems && problems.length > 0 && (
          <div className="shrink-0 text-sm text-ink-muted">
            <span className="font-medium text-ink">{solvedCount}</span> / {problems.length} solved
          </div>
        )}
      </div>

      {statusLoading && <Loader className="py-16" label="Loading..." />}

      {!statusLoading && status?.enabled === false && (
        <ComingSoon
          title="Coming soon"
          description="Coding practice isn't available in this environment yet — it's on the way in a future release."
        />
      )}

      {!statusLoading && status?.enabled !== false && (
        <>
          {!isLoading && problems && problems.length > 0 && (
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by title or tag..."
              className="max-w-sm"
            />
          )}

          {isLoading && <Loader className="py-16" label="Loading problems..." />}

          {!isLoading && problems?.length === 0 && (
            <Card className="py-16 text-center text-sm text-ink-muted">No coding problems published yet.</Card>
          )}

          <div className="flex flex-col gap-3">
            {filtered?.map((problem) => (
              <Link key={problem.id} to={`/coding/${problem.id}`}>
                <Card className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {problem.is_solved ? (
                      <CheckCircle2 size={18} className="shrink-0 text-success" />
                    ) : (
                      <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-black/15" />
                    )}
                    <div>
                      <h3 className="font-display text-base font-semibold text-ink">{problem.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {problem.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-ink-faint">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                      DIFFICULTY_STYLES[problem.difficulty] ?? "bg-black/5 text-ink-muted",
                    )}
                  >
                    {problem.difficulty}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

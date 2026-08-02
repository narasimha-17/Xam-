import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, History, Play, Send, XCircle } from "lucide-react";
import {
  fetchCodingProblem,
  fetchCodingStatus,
  fetchMySubmissions,
  runCodingProblem,
  submitCodingProblem,
} from "../lib/codingProblems";
import type { CodingLanguage } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ComingSoon } from "../components/ui/ComingSoon";
import { FullPageLoader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

const LANGUAGE_LABELS: Record<string, string> = { python: "Python", java: "Java", cpp: "C++" };
const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  hard: "bg-danger/15 text-danger",
};

export function CodingProblemSolve() {
  const { id } = useParams<{ id: string }>();
  const problemId = Number(id);
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["coding-status"],
    queryFn: fetchCodingStatus,
    staleTime: 5 * 60_000,
  });
  const { data: problem, isLoading } = useQuery({
    queryKey: ["coding-problem", problemId],
    queryFn: () => fetchCodingProblem(problemId),
    enabled: !Number.isNaN(problemId) && status?.enabled !== false,
  });
  const { data: submissions } = useQuery({
    queryKey: ["coding-submissions", problemId],
    queryFn: () => fetchMySubmissions(problemId),
    enabled: !Number.isNaN(problemId),
  });

  const [language, setLanguage] = useState<CodingLanguage | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (problem && !language) {
      const first = problem.languages[0];
      setLanguage(first ?? null);
      setCode((first && problem.starter_code[first]) ?? "");
    }
  }, [problem, language]);

  function handleLanguageChange(lang: CodingLanguage) {
    setLanguage(lang);
    setCode(problem?.starter_code[lang] ?? "");
  }

  const runMutation = useMutation({
    mutationFn: () => runCodingProblem(problemId, { language: language!, code }),
  });
  const submitMutation = useMutation({
    mutationFn: () => submitCodingProblem(problemId, { language: language!, code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coding-problem", problemId] });
      queryClient.invalidateQueries({ queryKey: ["coding-submissions", problemId] });
      queryClient.invalidateQueries({ queryKey: ["coding-problems"] });
    },
  });

  if (statusLoading) {
    return <FullPageLoader label="Loading..." />;
  }

  if (status?.enabled === false) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Link to="/coding" className="flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> All problems
        </Link>
        <ComingSoon
          title="Coming soon"
          description="Coding practice isn't available in this environment yet — it's on the way in a future release."
        />
      </div>
    );
  }

  if (isLoading || !problem) {
    return <FullPageLoader label="Loading problem..." />;
  }

  const runResult = runMutation.data;
  const submitResult = submitMutation.data;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/coding" className="flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> All problems
      </Link>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-xl font-semibold text-ink">{problem.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {problem.is_solved && (
              <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                <CheckCircle2 size={13} /> Solved
              </span>
            )}
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                DIFFICULTY_STYLES[problem.difficulty] ?? "bg-black/5 text-ink-muted",
              )}
            >
              {problem.difficulty}
            </span>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm text-ink-muted">{problem.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {problem.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-ink-faint">
              {tag}
            </span>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        {problem.languages.length > 1 && (
          <div className="flex gap-2">
            {problem.languages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageChange(lang)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  lang === language ? "bg-accent text-white" : "bg-base-soft/60 text-ink-muted hover:text-ink",
                )}
              >
                {LANGUAGE_LABELS[lang] ?? lang}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          rows={14}
          className="w-full rounded-xl border border-black/10 bg-base-soft/60 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />

        {problem.sample_test_cases.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Sample test cases</p>
            {problem.sample_test_cases.map((tc) => (
              <div key={tc.id} className="rounded-lg border border-black/10 bg-base-soft/30 p-3 font-mono text-xs">
                <p className="text-ink-muted">
                  Input: <span className="whitespace-pre-wrap text-ink">{tc.input || "(none)"}</span>
                </p>
                <p className="text-ink-muted">
                  Expected output: <span className="whitespace-pre-wrap text-ink">{tc.expected_output}</span>
                </p>
              </div>
            ))}
            {problem.hidden_test_case_count > 0 && (
              <p className="text-xs text-ink-faint">
                + {problem.hidden_test_case_count} hidden test case{problem.hidden_test_case_count === 1 ? "" : "s"}{" "}
                used when you submit.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => runMutation.mutate()} isLoading={runMutation.isPending}>
            <Play size={15} /> Run against samples
          </Button>
          <Button onClick={() => submitMutation.mutate()} isLoading={submitMutation.isPending}>
            <Send size={15} /> Submit
          </Button>
        </div>

        {runResult && (
          <TestCaseResults
            label={`${runResult.passed_count} / ${runResult.total_count} sample${runResult.total_count === 1 ? "" : "s"} passed`}
            results={runResult.test_case_results}
          />
        )}

        {submitResult && (
          <div className="flex flex-col gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium",
                submitResult.is_solved ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
              )}
            >
              {submitResult.is_solved ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {submitResult.is_solved
                ? "All test cases passed — solved!"
                : `${submitResult.passed_count} / ${submitResult.total_count} test cases passed`}
            </div>
            <TestCaseResults
              label="Sample test cases"
              results={submitResult.test_case_results.filter((tc) => tc.expected_output || tc.input)}
            />
          </div>
        )}
      </Card>

      {submissions && submissions.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
            <History size={16} /> Your submissions
          </h2>
          <div className="flex flex-col gap-1.5">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-muted">
                  {s.is_solved ? (
                    <CheckCircle2 size={14} className="text-success" />
                  ) : (
                    <XCircle size={14} className="text-danger" />
                  )}
                  {LANGUAGE_LABELS[s.language] ?? s.language} · {s.passed_count}/{s.total_count} passed
                </span>
                <span className="text-xs text-ink-faint">{new Date(s.submitted_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function TestCaseResults({
  label,
  results,
}: {
  label: string;
  results: { input: string; expected_output: string; actual_output: string; passed: boolean; error: string | null }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      {results.map((tc, i) => (
        <div key={i} className="flex flex-col gap-1 rounded-lg border border-black/10 p-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            {tc.passed ? (
              <CheckCircle2 size={14} className="text-success" />
            ) : (
              <XCircle size={14} className="text-danger" />
            )}
            <span className="font-body font-medium text-ink">Test case {i + 1}</span>
          </div>
          {(tc.input || tc.expected_output) && (
            <>
              <p className="text-ink-muted">
                Input: <span className="whitespace-pre-wrap text-ink">{tc.input || "(none)"}</span>
              </p>
              <p className="text-ink-muted">
                Expected: <span className="whitespace-pre-wrap text-ink">{tc.expected_output}</span>
              </p>
              <p className="text-ink-muted">
                Your output:{" "}
                <span className={cn("whitespace-pre-wrap", tc.passed ? "text-success" : "text-danger")}>
                  {tc.actual_output || "(empty)"}
                </span>
              </p>
            </>
          )}
          {tc.error && <p className="text-danger">{tc.error}</p>}
        </div>
      ))}
    </div>
  );
}

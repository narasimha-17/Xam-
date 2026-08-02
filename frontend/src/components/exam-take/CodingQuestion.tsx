import { useState } from "react";
import { Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { CodingAnswer, CodingLanguage, QuestionSafe, RunCodeResult } from "../../types/api";
import { runCodeAgainstSamples } from "../../lib/exams";
import { Button } from "../ui/Button";

interface Props {
  question: QuestionSafe;
  value: CodingAnswer | undefined;
  onChange: (value: CodingAnswer) => void;
}

const LANGUAGE_LABELS: Record<CodingLanguage, string> = {
  python: "Python",
  java: "Java",
  cpp: "C++",
};

export function CodingQuestion({ question, value, onChange }: Props) {
  const languages = (question.languages ?? []) as CodingLanguage[];
  const language = value?.language ?? languages[0];
  const code = value?.code ?? question.starter_code?.[language] ?? "";

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunCodeResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  function handleLanguageChange(lang: CodingLanguage) {
    const nextCode = question.starter_code?.[lang] ?? "";
    onChange({ language: lang, code: nextCode });
    setRunResult(null);
  }

  function handleCodeChange(nextCode: string) {
    onChange({ language, code: nextCode });
  }

  async function handleRun() {
    setRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const result = await runCodeAgainstSamples(question.id, { language, code });
      setRunResult(result);
    } catch {
      setRunError("Could not run your code right now. Try again in a moment.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {languages.length > 1 && (
        <div className="flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageChange(lang)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                lang === language ? "bg-accent text-white" : "bg-base-soft/60 text-ink-muted hover:text-ink"
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
        spellCheck={false}
        rows={12}
        className="w-full rounded-xl border border-black/10 bg-base-soft/60 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      />

      {question.sample_test_cases.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Sample test cases</p>
          {question.sample_test_cases.map((tc) => (
            <div key={tc.id} className="rounded-lg border border-black/10 bg-base-soft/30 p-3 font-mono text-xs">
              <p className="text-ink-muted">
                Input: <span className="text-ink">{tc.input || "(none)"}</span>
              </p>
              <p className="text-ink-muted">
                Expected output: <span className="text-ink">{tc.expected_output}</span>
              </p>
            </div>
          ))}
          {question.hidden_test_case_count > 0 && (
            <p className="text-xs text-ink-faint">
              + {question.hidden_test_case_count} hidden test case{question.hidden_test_case_count === 1 ? "" : "s"}{" "}
              used for grading.
            </p>
          )}
        </div>
      )}

      <Button type="button" variant="outline" className="w-fit" onClick={handleRun} disabled={running}>
        {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
        Run against samples
      </Button>

      {runError && <p className="text-sm text-danger">{runError}</p>}

      {runResult && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-ink-muted">
            {runResult.passed_count} / {runResult.total_count} sample{runResult.total_count === 1 ? "" : "s"} passed
          </p>
          {runResult.test_case_results.map((tc, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border border-black/10 p-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                {tc.passed ? (
                  <CheckCircle2 size={14} className="text-success" />
                ) : (
                  <XCircle size={14} className="text-danger" />
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
                Your output: <span className={tc.passed ? "text-success" : "text-danger"}>{tc.actual_output || "(empty)"}</span>
              </p>
              {tc.error && <p className="text-danger">{tc.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

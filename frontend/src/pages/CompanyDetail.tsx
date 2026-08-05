import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Code2,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  attemptCompanyAptitude,
  fetchCompany,
  fetchCompanyAptitude,
  fetchCompanyCoding,
  fetchCompanyTechnical,
  subscribeCompany,
} from "../lib/companies";
import type { CompanyAptitudeAttemptResult, CompanyAptitudeQuestion, CompanyTechnicalQuestion } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

type RoundTab = "coding" | "aptitude" | "technical";

const SECONDS_PER_APTITUDE_Q = 60;
const SECONDS_PER_TECHNICAL_Q = 90;

function useCountdown(totalSeconds: number, active: boolean, onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSeconds, active]);

  useEffect(() => {
    if (!active) return;
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, secondsLeft]);

  return secondsLeft;
}

function RoundTimer({ secondsLeft }: { secondsLeft: number }) {
  const minutes = Math.max(0, Math.floor(secondsLeft / 60));
  const seconds = Math.max(0, secondsLeft % 60);
  const lowTime = secondsLeft < 60;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold",
        lowTime ? "border-danger/40 bg-danger/10 text-danger" : "border-black/10 bg-base-soft/50 text-ink",
      )}
    >
      <Clock size={15} />
      {minutes}:{seconds.toString().padStart(2, "0")}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${((current + 1) / total) * 100}%` }}
      />
    </div>
  );
}

function AptitudeQuestionCard({
  question,
  onAnswered,
}: {
  question: CompanyAptitudeQuestion;
  onAnswered: (isCorrect: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<CompanyAptitudeAttemptResult | null>(null);

  const attemptMutation = useMutation({
    mutationFn: (index: number) => attemptCompanyAptitude(question.id, index),
    onSuccess: (data) => {
      setResult(data);
      onAnswered(data.is_correct);
    },
  });

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-sm font-medium text-ink">{question.question_text}</p>
      <div className="flex flex-col gap-2">
        {question.options.map((option, i) => {
          const isPicked = selected === i;
          const isCorrectOption = result?.correct_index === i;
          return (
            <button
              key={i}
              disabled={!!result}
              onClick={() => setSelected(i)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                result
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
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </button>
          );
        })}
      </div>
      {!result && (
        <Button
          className="w-fit"
          disabled={selected === null}
          isLoading={attemptMutation.isPending}
          onClick={() => selected !== null && attemptMutation.mutate(selected)}
        >
          Submit
        </Button>
      )}
      {result && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            result.is_correct ? "text-success" : "text-danger",
          )}
        >
          {result.is_correct ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {result.is_correct ? "Correct" : "Not quite"}
        </div>
      )}
      {result?.explanation && <p className="text-sm text-ink-muted">{result.explanation}</p>}
    </Card>
  );
}

function TechnicalQuestionCard({ question }: { question: CompanyTechnicalQuestion }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">{question.question_text}</p>
      {revealed ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {question.key_points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      ) : (
        <Button variant="outline" className="w-fit" onClick={() => setRevealed(true)}>
          <Lightbulb size={15} /> Show key points
        </Button>
      )}
    </Card>
  );
}

/** Runs a set of questions one at a time with an overall countdown, instead of one long scrollable list. */
function AptitudeRound({ questions }: { questions: CompanyAptitudeQuestion[] }) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCurrent, setAnsweredCurrent] = useState(false);
  const [finished, setFinished] = useState(false);

  const totalSeconds = Math.max(60, questions.length * SECONDS_PER_APTITUDE_Q);
  const secondsLeft = useCountdown(totalSeconds, started && !finished, () => setFinished(true));

  function restart() {
    setStarted(false);
    setIndex(0);
    setCorrectCount(0);
    setAnsweredCurrent(false);
    setFinished(false);
  }

  if (questions.length === 0) {
    return <Card className="py-12 text-center text-sm text-ink-muted">No aptitude questions added yet.</Card>;
  }

  if (!started) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <ListChecks size={28} className="text-accent-soft" />
        <h3 className="font-display text-lg font-semibold text-ink">Aptitude round</h3>
        <p className="max-w-sm text-sm text-ink-muted">
          {questions.length} questions &middot; {Math.round(totalSeconds / 60)} minutes. One question at a time —
          submit to see the answer, then move to the next. The round ends automatically when time runs out.
        </p>
        <Button onClick={() => setStarted(true)}>Start aptitude round</Button>
      </Card>
    );
  }

  if (finished) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <Trophy size={28} className="text-warning" />
        <h3 className="font-display text-lg font-semibold text-ink">Round complete</h3>
        <p className="text-sm text-ink-muted">
          You scored <span className="font-semibold text-ink">{correctCount}</span> out of{" "}
          <span className="font-semibold text-ink">{index + (answeredCurrent ? 1 : 0)}</span> answered
          {index + (answeredCurrent ? 1 : 0) < questions.length ? " before time ran out" : ""}.
        </p>
        <Button variant="outline" onClick={restart}>
          <RotateCcw size={15} /> Try again
        </Button>
      </Card>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-ink-muted">
          Question {index + 1} of {questions.length}
        </p>
        <RoundTimer secondsLeft={secondsLeft} />
      </div>
      <ProgressBar current={index} total={questions.length} />

      <AptitudeQuestionCard
        key={question.id}
        question={question}
        onAnswered={(isCorrect) => {
          setAnsweredCurrent(true);
          if (isCorrect) setCorrectCount((c) => c + 1);
        }}
      />

      {answeredCurrent && (
        <Button
          className="w-fit"
          onClick={() => {
            if (isLast) {
              setFinished(true);
            } else {
              setIndex((i) => i + 1);
              setAnsweredCurrent(false);
            }
          }}
        >
          {isLast ? "Finish round" : "Next question"}
        </Button>
      )}
    </div>
  );
}

function TechnicalRound({ questions }: { questions: CompanyTechnicalQuestion[] }) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const totalSeconds = Math.max(60, questions.length * SECONDS_PER_TECHNICAL_Q);
  const secondsLeft = useCountdown(totalSeconds, started && !finished, () => setFinished(true));

  function restart() {
    setStarted(false);
    setIndex(0);
    setFinished(false);
  }

  if (questions.length === 0) {
    return <Card className="py-12 text-center text-sm text-ink-muted">No technical questions added yet.</Card>;
  }

  if (!started) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <MessageSquareText size={28} className="text-accent-soft" />
        <h3 className="font-display text-lg font-semibold text-ink">Technical round</h3>
        <p className="max-w-sm text-sm text-ink-muted">
          {questions.length} questions &middot; {Math.round(totalSeconds / 60)} minutes. One question at a time —
          think it through, reveal the key points, then move to the next.
        </p>
        <Button onClick={() => setStarted(true)}>Start technical round</Button>
      </Card>
    );
  }

  if (finished) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <Trophy size={28} className="text-warning" />
        <h3 className="font-display text-lg font-semibold text-ink">Round complete</h3>
        <p className="text-sm text-ink-muted">
          You reviewed <span className="font-semibold text-ink">{index + 1}</span> of{" "}
          <span className="font-semibold text-ink">{questions.length}</span> questions.
        </p>
        <Button variant="outline" onClick={restart}>
          <RotateCcw size={15} /> Review again
        </Button>
      </Card>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-ink-muted">
          Question {index + 1} of {questions.length}
        </p>
        <RoundTimer secondsLeft={secondsLeft} />
      </div>
      <ProgressBar current={index} total={questions.length} />

      <TechnicalQuestionCard key={question.id} question={question} />

      <Button
        className="w-fit"
        onClick={() => {
          if (isLast) {
            setFinished(true);
          } else {
            setIndex((i) => i + 1);
          }
        }}
      >
        {isLast ? "Finish round" : "Next question"}
      </Button>
    </div>
  );
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const companyId = Number(id);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<RoundTab>("coding");

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => fetchCompany(companyId),
    enabled: !Number.isNaN(companyId),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => subscribeCompany(companyId),
    onSuccess: (data) => {
      queryClient.setQueryData(["company", companyId], data);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const subscribed = company?.is_subscribed ?? false;

  const { data: coding } = useQuery({
    queryKey: ["company-coding", companyId],
    queryFn: () => fetchCompanyCoding(companyId),
    enabled: tab === "coding",
  });
  const { data: aptitude } = useQuery({
    queryKey: ["company-aptitude", companyId],
    queryFn: () => fetchCompanyAptitude(companyId),
    enabled: tab === "aptitude",
  });
  const { data: technical } = useQuery({
    queryKey: ["company-technical", companyId],
    queryFn: () => fetchCompanyTechnical(companyId),
    enabled: tab === "technical",
  });

  if (isLoading || !company) return <Loader className="py-24" label="Loading company..." />;

  const TABS: { id: RoundTab; label: string; icon: typeof Code2; count: number }[] = [
    { id: "coding", label: "Coding", icon: Code2, count: company.coding_count },
    { id: "aptitude", label: "Aptitude", icon: ListChecks, count: company.aptitude_count },
    { id: "technical", label: "Technical", icon: MessageSquareText, count: company.technical_count },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link to="/companies" className="flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to companies
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{company.name}</h1>
          {company.description && <p className="mt-1 text-sm text-ink-muted">{company.description}</p>}
        </div>
        <Button
          variant={subscribed ? "outline" : "primary"}
          isLoading={subscribeMutation.isPending}
          onClick={() => subscribeMutation.mutate()}
          disabled={subscribed}
          title="Bookmark this company to your prep list — all material below is open to everyone"
        >
          {subscribed ? (
            <>
              <BookmarkCheck size={16} /> Subscribed
            </>
          ) : (
            <>
              <Bookmark size={16} /> Subscribe
            </>
          )}
        </Button>
      </div>

      <div className="flex gap-1 rounded-xl border border-black/10 bg-base-soft/50 p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              tab === id ? "bg-base-panel text-ink shadow-glow" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon size={14} className="text-accent-soft" />
            {label} <span className="text-xs text-ink-faint">({count})</span>
          </button>
        ))}
      </div>

      {tab === "coding" && (
        <div className="flex flex-col gap-3">
          {coding?.length === 0 && (
            <Card className="py-12 text-center text-sm text-ink-muted">No coding problems added yet.</Card>
          )}
          {coding?.map((problem) => (
            <Link key={problem.id} to={`/coding/${problem.id}`}>
              <Card className="flex items-center justify-between gap-4 p-4">
                <p className="text-sm font-medium text-ink">{problem.title}</p>
                <span className="shrink-0 rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium capitalize text-ink-faint">
                  {problem.difficulty}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {tab === "aptitude" && aptitude && <AptitudeRound questions={aptitude} />}
      {tab === "technical" && technical && <TechnicalRound questions={technical} />}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Code2,
  Lightbulb,
  ListChecks,
  MessageSquareText,
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
import type { CompanyAptitudeAttemptResult } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

type RoundTab = "coding" | "aptitude" | "technical";

function AptitudeQuestionCard({ questionId, questionText, options }: { questionId: number; questionText: string; options: string[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<CompanyAptitudeAttemptResult | null>(null);

  const attemptMutation = useMutation({
    mutationFn: (index: number) => attemptCompanyAptitude(questionId, index),
    onSuccess: (data) => setResult(data),
  });

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-sm font-medium text-ink">{questionText}</p>
      <div className="flex flex-col gap-2">
        {options.map((option, i) => {
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

function TechnicalQuestionCard({ questionText, keyPoints }: { questionText: string; keyPoints: string[] }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">{questionText}</p>
      {revealed ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {keyPoints.map((p, i) => (
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
    <div className="flex flex-col gap-6">
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

      {tab === "aptitude" && (
        <div className="flex flex-col gap-4">
          {aptitude?.length === 0 && (
            <Card className="py-12 text-center text-sm text-ink-muted">No aptitude questions added yet.</Card>
          )}
          {aptitude?.map((q) => (
            <AptitudeQuestionCard key={q.id} questionId={q.id} questionText={q.question_text} options={q.options} />
          ))}
        </div>
      )}

      {tab === "technical" && (
        <div className="flex flex-col gap-4">
          {technical?.length === 0 && (
            <Card className="py-12 text-center text-sm text-ink-muted">No technical questions added yet.</Card>
          )}
          {technical?.map((q) => (
            <TechnicalQuestionCard key={q.id} questionText={q.question_text} keyPoints={q.key_points} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock3, Sparkles } from "lucide-react";
import { generateQuestions } from "../../lib/exams";
import { fetchAiStatus } from "../../lib/ai";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { QuestionType } from "../../types/api";
import { fromGeneratedQuestion, type QuestionFormValues } from "./types";

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple choice (single answer)",
  maq: "Multiple choice (multiple answers)",
  match: "Match the following",
  fill_blank: "Fill in the blank",
  coding: "Coding",
};

export function AiGeneratePanel({
  subjectId,
  onGenerated,
}: {
  subjectId: number;
  onGenerated: (questions: QuestionFormValues[]) => void;
}) {
  const [topic, setTopic] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [count, setCount] = useState(3);
  const [warning, setWarning] = useState<string | null>(null);

  const { data: aiStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["ai-status"],
    queryFn: fetchAiStatus,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => generateQuestions({ subject_id: subjectId, topic, question_type: questionType, count }),
    onSuccess: (result) => {
      if (result.error && result.questions.length === 0) {
        setWarning(result.error);
        return;
      }
      setWarning(result.error);
      onGenerated(result.questions.map(fromGeneratedQuestion));
    },
  });

  if (!statusLoading && aiStatus?.enabled === false) {
    return (
      <Card className="flex items-center gap-3 border-accent/20 bg-accent/[0.03]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
          <Sparkles size={16} />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Generate with Xipe</h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-faint">
            <Clock3 size={12} /> Coming soon in this environment
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 border-accent/20 bg-accent/[0.03]">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
          <Sparkles size={16} />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Generate with Xipe</h2>
          <p className="text-xs text-ink-muted">Xipe drafts questions using your local model — review and edit before saving.</p>
        </div>
      </div>

      <Input
        label="Topic"
        placeholder="e.g. binary search trees, time complexity of sorting algorithms"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Question type"
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value as QuestionType)}
        >
          {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Input
          label="How many"
          type="number"
          min="1"
          max="100"
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
        />
      </div>
      {count > 20 && (
        <p className="text-xs text-warning">
          {count} questions on this CPU-only local model could take a very long time (potentially an hour or more).
          Consider generating in smaller batches instead.
        </p>
      )}

      {mutation.isPending && (
        <p className="text-sm text-ink-muted">
          Asking Xipe — on CPU this can take several minutes, especially for more questions or coding
          type. Feel free to keep working; this panel will update when it's done.
        </p>
      )}
      {mutation.isError && <p className="text-sm text-danger">Could not reach Xipe. Try again.</p>}
      {warning && <p className="text-sm text-warning">{warning}</p>}
      {mutation.isSuccess && !mutation.isPending && mutation.data.questions.length > 0 && (
        <p className="text-sm text-success">
          Added {mutation.data.generated_count} draft question{mutation.data.generated_count === 1 ? "" : "s"} below
          — review before saving.
        </p>
      )}

      <Button
        type="button"
        onClick={() => {
          setWarning(null);
          mutation.mutate();
        }}
        isLoading={mutation.isPending}
        disabled={!topic.trim()}
        className="w-fit"
      >
        <Sparkles size={16} /> Generate
      </Button>
    </Card>
  );
}

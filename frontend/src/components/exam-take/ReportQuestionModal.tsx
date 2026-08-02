import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { reportQuestion } from "../../lib/exams";
import type { AnswerPayload, QuestionReportReason } from "../../types/api";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";
import { cn } from "../../lib/utils";

const REASONS: { value: QuestionReportReason; label: string }[] = [
  { value: "wrong_answer", label: "The marked correct answer looks wrong" },
  { value: "unclear_wording", label: "The question is unclear or ambiguous" },
  { value: "typo", label: "There's a typo or formatting issue" },
  { value: "other", label: "Something else" },
];

export function ReportQuestionModal({
  questionId,
  answer,
  open,
  onClose,
}: {
  questionId: number;
  answer: AnswerPayload | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<QuestionReportReason>("wrong_answer");
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      reportQuestion(questionId, {
        reason,
        comment: comment.trim() || null,
        submitted_answer: (answer as unknown as Record<string, unknown>) ?? null,
      }),
  });

  function handleClose() {
    mutation.reset();
    setComment("");
    setReason("wrong_answer");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Report this question">
      {mutation.isSuccess ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-success">Thanks — your report has been sent to the instructors.</p>
          <Button onClick={handleClose} className="w-fit">
            Done
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {REASONS.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border border-l-4 border-black/10 border-l-transparent bg-base-soft/40 px-4 py-2.5 pl-3.5 transition-colors hover:border-accent/40",
                  reason === r.value && "border-accent/60 border-l-accent bg-accent/10",
                )}
              >
                <input
                  type="radio"
                  name="report-reason"
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="text-sm text-ink">{r.label}</span>
              </label>
            ))}
          </div>
          <Textarea
            label="Additional details (optional)"
            rows={3}
            placeholder="Anything else the instructor should know?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {mutation.isError && <p className="text-sm text-danger">Could not submit your report. Try again.</p>}
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
              <Flag size={15} /> Submit report
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

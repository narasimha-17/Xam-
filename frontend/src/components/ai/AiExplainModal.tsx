import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock3, ExternalLink, Lightbulb, Sparkles } from "lucide-react";
import { explainPdf, explainTopic, fetchAiStatus } from "../../lib/ai";
import type { ExplainResult } from "../../types/api";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

type Source = { kind: "topic"; subjectId: number } | { kind: "pdf"; pdfId: number; pdfTitle: string };

function ExplainResultView({ result }: { result: ExplainResult }) {
  const paragraphs = result.story.split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <div className="flex flex-col gap-5">
      {result.title && <h3 className="font-display text-lg font-semibold text-ink">{result.title}</h3>}

      <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-muted">
        {paragraphs.map((p, i) => (
          <p key={i}>{p.trim()}</p>
        ))}
      </div>

      {result.examples.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Examples</h4>
          {result.examples.map((ex, i) => (
            <div key={i} className="rounded-xl border border-black/10 bg-base-soft/60 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Lightbulb size={14} className="text-warning" /> {ex.title}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{ex.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {result.related_links.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Explore further</h4>
          <div className="flex flex-col gap-1.5">
            {result.related_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
              >
                <ExternalLink size={13} /> {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AiExplainModal({ open, onClose, source }: { open: boolean; onClose: () => void; source: Source }) {
  const [topic, setTopic] = useState("");

  const { data: aiStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["ai-status"],
    queryFn: fetchAiStatus,
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      source.kind === "topic" ? explainTopic({ subject_id: source.subjectId, topic }) : explainPdf({ pdf_id: source.pdfId }),
  });

  function handleClose() {
    mutation.reset();
    setTopic("");
    onClose();
  }

  const title = source.kind === "topic" ? "Xipe topic explainer" : `Explain "${source.pdfTitle}"`;

  if (!statusLoading && aiStatus?.enabled === false) {
    return (
      <Modal open={open} onClose={handleClose} title={title} className="max-w-lg">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
            <Clock3 size={22} />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">Coming soon</h3>
          <p className="max-w-xs text-sm text-ink-muted">
            Xipe isn't available in this environment yet — it's on the way in a future release.
          </p>
          <Button variant="outline" onClick={handleClose} className="mt-2">
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} className="max-w-lg">
      <div className="flex flex-col gap-4">
        {source.kind === "topic" && !mutation.data && (
          <Input
            label="What do you want explained?"
            placeholder="e.g. binary search trees, normalization in DBMS"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        )}

        {!mutation.data && (
          <p className="text-xs text-ink-faint">
            Xipe runs on your local model — on CPU this can take a few minutes. Feel free to keep the modal open.
          </p>
        )}

        {mutation.isPending && (
          <p className="text-sm text-ink-muted">Xipe is thinking this through and writing it up…</p>
        )}

        {mutation.isError && (
          <p className="text-sm text-danger">Could not reach Xipe. Try again.</p>
        )}

        {mutation.data?.error && <p className="text-sm text-danger">{mutation.data.error}</p>}

        {mutation.data && !mutation.data.error && <ExplainResultView result={mutation.data} />}

        <div className="flex items-center justify-end gap-3">
          {mutation.data && (
            <Button variant="outline" onClick={() => mutation.reset()}>
              Ask something else
            </Button>
          )}
          {(!mutation.data || mutation.data.error) && (
            <Button
              onClick={() => mutation.mutate()}
              isLoading={mutation.isPending}
              disabled={source.kind === "topic" && !topic.trim()}
            >
              <Sparkles size={16} /> Explain
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

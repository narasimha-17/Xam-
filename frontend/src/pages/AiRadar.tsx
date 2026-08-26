import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Pencil, Plus, Radio, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { fetchAiStatus } from "../lib/ai";
import {
  createAiRadarItem,
  deleteAiRadarItem,
  fetchAiRadarItems,
  reasonAiRadarItem,
  runAiRadarPipeline,
  updateAiRadarItem,
} from "../lib/aiRadar";
import type { AiRadarItem } from "../types/api";
import { cn } from "../lib/utils";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Loader } from "../components/ui/Loader";

interface ItemFormValues {
  title: string;
  url: string;
  source: string;
  snippet: string;
  summary: string;
  use_cases: string;
}

const EMPTY_FORM: ItemFormValues = { title: "", url: "", source: "", snippet: "", summary: "", use_cases: "" };

function extractErrorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;
}

export function AiRadar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["ai-status"],
    queryFn: fetchAiStatus,
    staleTime: 5 * 60_000,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["ai-radar"],
    queryFn: fetchAiRadarItems,
  });

  const { register, handleSubmit, reset, formState } = useForm<ItemFormValues>({ defaultValues: EMPTY_FORM });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ai-radar"] });

  const createMutation = useMutation({
    mutationFn: (values: ItemFormValues) =>
      createAiRadarItem({
        title: values.title,
        url: values.url,
        source: values.source || null,
        snippet: values.snippet || null,
        summary: values.summary || null,
        use_cases: values.use_cases || null,
      }),
    onSuccess: () => {
      invalidate();
      reset(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: ItemFormValues) =>
      updateAiRadarItem(editingId as number, {
        title: values.title,
        url: values.url,
        source: values.source || null,
        snippet: values.snippet || null,
        summary: values.summary || null,
        use_cases: values.use_cases || null,
      }),
    onSuccess: () => {
      invalidate();
      reset(EMPTY_FORM);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAiRadarItem(id),
    onSuccess: invalidate,
  });

  const runMutation = useMutation({
    mutationFn: runAiRadarPipeline,
    onSuccess: (result) => {
      invalidate();
      setRunError(result.error);
    },
    onError: (err) => setRunError(extractErrorMessage(err, "Pipeline run failed.")),
  });

  const [reasonErrors, setReasonErrors] = useState<Record<number, string>>({});
  const reasonMutation = useMutation({
    mutationFn: (id: number) => reasonAiRadarItem(id),
    onSuccess: (_data, id) => {
      invalidate();
      setReasonErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    onError: (err, id) => setReasonErrors((prev) => ({ ...prev, [id]: extractErrorMessage(err, "Reasoning failed.") })),
  });

  function startEdit(item: AiRadarItem) {
    setEditingId(item.id);
    reset({
      title: item.title,
      url: item.url,
      source: item.source ?? "",
      snippet: item.snippet ?? "",
      summary: item.summary ?? "",
      use_cases: item.use_cases ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    reset(EMPTY_FORM);
  }

  if (statusLoading) return <Loader label="Loading..." />;

  const aiEnabled = status?.enabled === true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <Radio size={24} className="text-accent-soft" /> AI Radar
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Daily-fetched AI/model-release news, with reasoning on real-world use cases for each capability.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => runMutation.mutate()}
            isLoading={runMutation.isPending}
            variant="outline"
            disabled={!aiEnabled}
            title={aiEnabled ? undefined : "Automatic search + reasoning needs AI features enabled in this environment."}
          >
            <RefreshCw size={14} /> Run pipeline now
          </Button>
        )}
      </div>

      {isAdmin && !aiEnabled && (
        <Card className="border-warning/30 bg-warning/5">
          <p className="text-sm text-ink">
            AI features aren't enabled in this environment, so the daily search + reasoning pipeline can't run here.
            You can still browse existing items and add entries manually below.
          </p>
        </Card>
      )}

      {isAdmin && runMutation.isSuccess && (
        <Card className={runError ? "border-danger/30 bg-danger/5" : "border-accent/30 bg-accent/5"}>
          <p className="text-sm text-ink">
            {runError
              ? `Pipeline ran with an issue: ${runError}`
              : `Pipeline ran successfully — ${runMutation.data?.added ?? 0} new item(s) added.`}
          </p>
        </Card>
      )}

      {isAdmin && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-ink">{editingId ? "Edit entry" : "Add entry manually"}</h2>
          <form
            onSubmit={handleSubmit((values) =>
              editingId ? updateMutation.mutate(values) : createMutation.mutate(values),
            )}
            className="flex flex-col gap-2"
          >
            <Input placeholder="Title" {...register("title", { required: true })} />
            <Input placeholder="URL" {...register("url", { required: true })} />
            <Input placeholder="Source (optional, e.g. techcrunch.com)" {...register("source")} />
            <Textarea placeholder="Snippet (optional)" rows={2} {...register("snippet")} />
            <Textarea placeholder="Summary — what's new (optional)" rows={2} {...register("summary")} />
            <Textarea
              placeholder="Use cases — real-world applications, one per line (optional)"
              rows={3}
              {...register("use_cases")}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
                disabled={!formState.isValid}
                className="text-sm"
              >
                {editingId ? (
                  <>
                    <Pencil size={14} /> Save changes
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Add entry
                  </>
                )}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit} className="text-sm">
                  <X size={14} /> Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {isLoading && <Loader label="Loading..." />}
        {items?.length === 0 && (
          <Card className="text-center text-sm text-ink-muted">
            {isAdmin ? "Nothing yet — wait for the next daily run or add an entry manually." : "Nothing yet — check back soon."}
          </Card>
        )}
        {items?.map((item) => {
          const isExpanded = expandedIds.has(item.id);
          const hasDetail = Boolean(item.summary || item.use_cases);
          return (
            <Card key={item.id} className="flex flex-col gap-2 p-0">
              <button
                type="button"
                onClick={() => toggleExpanded(item.id)}
                className="flex w-full items-start justify-between gap-3 p-4 text-left"
              >
                <div>
                  <p className="font-display text-base font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {item.source ?? new URL(item.url).hostname} &middot;{" "}
                    {new Date(item.found_at).toLocaleDateString()}
                    {isAdmin && (
                      <> &middot; {item.is_manual ? "Added by admin" : `Auto-fetched (“${item.query}”)`}</>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isAdmin && (
                    <>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(item);
                        }}
                        className="rounded p-1 text-ink-faint hover:text-ink"
                      >
                        <Pencil size={14} />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(item.id);
                        }}
                        className="rounded p-1 text-ink-faint hover:text-danger"
                      >
                        <Trash2 size={14} />
                      </span>
                    </>
                  )}
                  <ChevronDown
                    size={16}
                    className={cn("text-ink-faint transition-transform", isExpanded && "rotate-180")}
                  />
                </div>
              </button>
              {isExpanded && (
                <div className="flex flex-col gap-3 border-t border-black/10 p-4 pt-3">
                  {item.summary && <p className="text-sm text-ink">{item.summary}</p>}
                  {item.use_cases && (
                    <div className="rounded-xl bg-accent/5 p-3 text-sm text-ink-muted">
                      <p className="mb-1 font-medium text-ink">Potential use cases</p>
                      <p className="whitespace-pre-line">{item.use_cases}</p>
                    </div>
                  )}
                  {!hasDetail && <p className="text-sm text-ink-muted">No reasoning available for this item yet.</p>}
                  {isAdmin && reasonErrors[item.id] && (
                    <p className="text-sm text-danger">{reasonErrors[item.id]}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex w-fit items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                    >
                      Visit source <ExternalLink size={14} />
                    </a>
                    {isAdmin && aiEnabled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reasonMutation.mutate(item.id);
                        }}
                        disabled={reasonMutation.isPending && reasonMutation.variables === item.id}
                        className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50"
                      >
                        <Sparkles
                          size={14}
                          className={cn(reasonMutation.isPending && reasonMutation.variables === item.id && "animate-pulse")}
                        />
                        {hasDetail ? "Re-run reasoning" : "Generate reasoning"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

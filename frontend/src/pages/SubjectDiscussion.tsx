import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Flame, Image as ImageIcon, Lock, MessageCircle, Plus, Sparkles, TrendingUp } from "lucide-react";
import { fetchSubject } from "../lib/subjects";
import { createThread, fetchThreads } from "../lib/discussions";
import type { DiscussionThread } from "../types/api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { Loader } from "../components/ui/Loader";
import { cn, timeAgo } from "../lib/utils";

interface ThreadFormValues {
  title: string;
  body: string;
}

type SortMode = "hot" | "new" | "top";

const SORT_OPTIONS: { id: SortMode; label: string; icon: typeof Flame }[] = [
  { id: "hot", label: "Hot", icon: Flame },
  { id: "new", label: "New", icon: Sparkles },
  { id: "top", label: "Top", icon: TrendingUp },
];

function hotScore(thread: DiscussionThread): number {
  const hoursSinceActivity = (Date.now() - new Date(thread.last_activity_at).getTime()) / 3_600_000;
  return thread.post_count / Math.pow(hoursSinceActivity + 2, 1.5);
}

function sortThreads(threads: DiscussionThread[], mode: SortMode): DiscussionThread[] {
  const sorted = [...threads];
  if (mode === "new") {
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (mode === "top") {
    sorted.sort((a, b) => b.post_count - a.post_count);
  } else {
    sorted.sort((a, b) => hotScore(b) - hotScore(a));
  }
  return sorted;
}

export function SubjectDiscussion() {
  const { id } = useParams<{ id: string }>();
  const subjectId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("hot");

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: () => fetchSubject(subjectId),
    enabled: !Number.isNaN(subjectId),
  });

  const { data: threads, isLoading } = useQuery({
    queryKey: ["discussions", subjectId],
    queryFn: () => fetchThreads(subjectId),
    enabled: !Number.isNaN(subjectId),
  });

  const sortedThreads = useMemo(() => sortThreads(threads ?? [], sortMode), [threads, sortMode]);

  const { register, handleSubmit, reset, formState } = useForm<ThreadFormValues>();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useMutation({
    mutationFn: (values: ThreadFormValues) =>
      createThread(subjectId, values.title, values.body, imageInputRef.current?.files?.[0] ?? null),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["discussions", subjectId] });
      setModalOpen(false);
      reset();
      if (imageInputRef.current) imageInputRef.current.value = "";
      navigate(`/subjects/${subjectId}/discussion/${thread.id}`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/subjects/${subjectId}`} className="flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to subject
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent-soft">Xipe Community</p>
          <h1 className="mt-0.5 font-display text-2xl font-semibold text-ink">{subject?.name ?? "Discussion"}</h1>
          <p className="mt-1 text-sm text-ink-muted">Ask questions and help fellow students.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New thread
        </Button>
      </div>

      <div className="flex gap-1 rounded-xl border border-black/10 bg-base-soft/50 p-1 w-fit">
        {SORT_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSortMode(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              sortMode === id ? "bg-base-panel text-ink shadow-glow" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon size={14} className="text-accent-soft" />
            {label}
          </button>
        ))}
      </div>

      {isLoading && <Loader className="py-16" label="Loading threads..." />}
      {!isLoading && threads?.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">No discussion threads yet — start one.</Card>
      )}

      <div className="flex flex-col gap-3">
        {sortedThreads.map((thread) => (
          <Link key={thread.id} to={`/subjects/${subjectId}/discussion/${thread.id}`}>
            <Card className="flex items-start gap-4 p-4">
              <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10 px-3 py-2 text-accent">
                <MessageCircle size={16} />
                <span className="mt-0.5 text-sm font-semibold">{Math.max(thread.post_count - 1, 0)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {thread.is_locked && <Lock size={13} className="shrink-0 text-ink-faint" />}
                  <p className="truncate text-sm font-semibold text-ink">{thread.title}</p>
                </div>
                {thread.preview && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{thread.preview}</p>
                )}
                <p className="mt-1.5 text-xs text-ink-faint">
                  by {thread.author_name} &middot; posted {timeAgo(thread.created_at)}
                  {thread.post_count > 1 && <> &middot; active {timeAgo(thread.last_activity_at)}</>}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New thread">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="flex flex-col gap-4">
          <Input label="Title" placeholder="What's your question?" {...register("title", { required: true })} />
          <Textarea
            label="Details"
            rows={4}
            placeholder="Describe what you're stuck on..."
            {...register("body", { required: true })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
              <ImageIcon size={13} /> Photo (optional)
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-accent-soft"
            />
          </div>
          <Button type="submit" isLoading={createMutation.isPending} disabled={!formState.isValid} className="w-full">
            Post thread
          </Button>
        </form>
      </Modal>
    </div>
  );
}

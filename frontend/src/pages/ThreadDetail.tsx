import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Lock, LockOpen, Send, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { createPost, deletePost, fetchThread, setThreadLocked } from "../lib/discussions";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Loader } from "../components/ui/Loader";
import { PostImage } from "../components/discussion/PostImage";

export function ThreadDetail() {
  const { id, threadId } = useParams<{ id: string; threadId: string }>();
  const subjectId = Number(id);
  const threadIdNum = Number(threadId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const replyImageInputRef = useRef<HTMLInputElement>(null);

  const { data: thread, isLoading } = useQuery({
    queryKey: ["thread", threadIdNum],
    queryFn: () => fetchThread(threadIdNum),
    enabled: !Number.isNaN(threadIdNum),
  });

  const replyMutation = useMutation({
    mutationFn: () => createPost(threadIdNum, reply, undefined, replyImageInputRef.current?.files?.[0] ?? null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread", threadIdNum] });
      setReply("");
      if (replyImageInputRef.current) replyImageInputRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: number) => deletePost(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["thread", threadIdNum] }),
  });

  const lockMutation = useMutation({
    mutationFn: (isLocked: boolean) => setThreadLocked(threadIdNum, isLocked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["thread", threadIdNum] }),
  });

  if (isLoading || !thread) return <Loader className="py-24" label="Loading thread..." />;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/subjects/${subjectId}/discussion`}
        className="flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to threads
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-ink">{thread.title}</h1>
          {thread.is_locked && (
            <span className="flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs text-ink-muted">
              <Lock size={11} /> Locked
            </span>
          )}
        </div>
        {user?.role === "admin" && (
          <Button
            variant="outline"
            isLoading={lockMutation.isPending}
            onClick={() => lockMutation.mutate(!thread.is_locked)}
          >
            {thread.is_locked ? (
              <>
                <LockOpen size={15} /> Unlock
              </>
            ) : (
              <>
                <Lock size={15} /> Lock thread
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {thread.posts.map((post, i) => (
          <Card key={post.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-display text-xs font-semibold text-white">
                  {post.author_name[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium text-ink">{post.author_name}</span>
                {i === 0 && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-soft">Original</span>
                )}
                <span className="text-xs text-ink-faint">{new Date(post.created_at).toLocaleString()}</span>
              </div>
              {(post.user_id === user?.id || user?.role === "admin") && (
                <button
                  onClick={() => deleteMutation.mutate(post.id)}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink-muted">{post.body}</p>
            {post.image_url && <PostImage postId={post.id} />}
          </Card>
        ))}
      </div>

      {thread.is_locked ? (
        <Card className="flex items-center gap-2 text-sm text-ink-muted">
          <Lock size={15} /> This thread is locked. No new replies can be posted.
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="w-full rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
          />
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
              <ImageIcon size={13} /> Photo (optional)
            </label>
            <input
              ref={replyImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-accent-soft"
            />
          </div>
          <Button
            className="w-fit"
            disabled={!reply.trim()}
            isLoading={replyMutation.isPending}
            onClick={() => replyMutation.mutate()}
          >
            <Send size={15} /> Reply
          </Button>
        </Card>
      )}
    </div>
  );
}

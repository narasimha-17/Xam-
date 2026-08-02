import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Plus } from "lucide-react";
import { fetchSubject } from "../lib/subjects";
import { createThread, fetchThreads } from "../lib/discussions";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { Loader } from "../components/ui/Loader";

interface ThreadFormValues {
  title: string;
  body: string;
}

export function SubjectDiscussion() {
  const { id } = useParams<{ id: string }>();
  const subjectId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

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

  const { register, handleSubmit, reset, formState } = useForm<ThreadFormValues>();

  const createMutation = useMutation({
    mutationFn: (values: ThreadFormValues) => createThread(subjectId, values.title, values.body),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["discussions", subjectId] });
      setModalOpen(false);
      reset();
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
          <h1 className="font-display text-2xl font-semibold text-ink">{subject?.name ?? "Discussion"}</h1>
          <p className="mt-1 text-sm text-ink-muted">Ask questions and help fellow students.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New thread
        </Button>
      </div>

      {isLoading && <Loader className="py-16" label="Loading threads..." />}
      {!isLoading && threads?.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">No discussion threads yet — start one.</Card>
      )}

      <div className="flex flex-col gap-3">
        {threads?.map((thread) => (
          <Link key={thread.id} to={`/subjects/${subjectId}/discussion/${thread.id}`}>
            <Card className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">{thread.title}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  by {thread.author_name} · {new Date(thread.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-ink-faint">
                <MessageCircle size={14} /> {thread.post_count}
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
          <Button type="submit" isLoading={createMutation.isPending} disabled={!formState.isValid} className="w-full">
            Post thread
          </Button>
        </form>
      </Modal>
    </div>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, FileText, Plus, Target } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { createSubject, fetchSubjects } from "../lib/subjects";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { Loader } from "../components/ui/Loader";
import { SearchInput } from "../components/ui/SearchInput";

interface SubjectFormValues {
  name: string;
  description: string;
}

// Rotating tile colors so the catalog reads as a colorful course grid, Whizlabs-style.
const TILE_STYLES = [
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
];

export function Subjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: subjects, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  const filteredSubjects = subjects?.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
  });

  const { register, handleSubmit, reset, formState } = useForm<SubjectFormValues>();

  const createMutation = useMutation({
    mutationFn: (values: SubjectFormValues) => createSubject(values.name, values.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setModalOpen(false);
      reset();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Subjects</h1>
          <p className="mt-1 text-sm text-ink-muted">Browse engineering subjects to practice.</p>
        </div>
        {user?.role === "admin" && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New subject
          </Button>
        )}
      </div>

      {!isLoading && subjects && subjects.length > 0 && (
        <SearchInput value={search} onChange={setSearch} placeholder="Search subjects..." className="max-w-sm" />
      )}

      {isLoading && <Loader className="py-16" label="Loading subjects..." />}

      {!isLoading && subjects?.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">No subjects yet.</Card>
      )}

      {!isLoading && subjects && subjects.length > 0 && filteredSubjects?.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">No subjects match "{search}".</Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects?.map((subject, index) => (
          <Link key={subject.id} to={`/subjects/${subject.id}`}>
            <Card className="flex h-full flex-col gap-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${TILE_STYLES[index % TILE_STYLES.length]}`}
              >
                <BookOpen size={20} strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{subject.name}</h3>
                {subject.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{subject.description}</p>
                )}
              </div>
              <div className="mt-auto flex items-center gap-4 text-xs text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <Target size={13} /> {subject.exam_count} exam{subject.exam_count === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText size={13} /> {subject.pdf_count} PDF{subject.pdf_count === 1 ? "" : "s"}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New subject">
        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          className="flex flex-col gap-4"
        >
          <Input label="Name" placeholder="e.g. Digital Electronics" {...register("name", { required: true })} />
          <Textarea
            label="Description"
            placeholder="Short description of what this subject covers"
            rows={3}
            {...register("description")}
          />
          <Button type="submit" isLoading={createMutation.isPending} disabled={!formState.isValid} className="w-full">
            <FileText size={16} /> Create subject
          </Button>
        </form>
      </Modal>
    </div>
  );
}

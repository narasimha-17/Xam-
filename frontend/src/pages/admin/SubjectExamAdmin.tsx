import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Clock, Copy, HelpCircle, Plus, Target, Trash2 } from "lucide-react";
import { createSubject, deleteSubject, fetchSubjects } from "../../lib/subjects";
import { deleteExam, duplicateExam, fetchExams, setExamPublished } from "../../lib/exams";
import type { EducationLevel, ExamSummary } from "../../types/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Loader } from "../../components/ui/Loader";
import { Modal } from "../../components/ui/Modal";
import { cn } from "../../lib/utils";

interface SubjectFormValues {
  name: string;
  description: string;
  education_level: EducationLevel | "";
}

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  school: "School",
  college: "College",
  engineering: "Engineering",
};

function examAvailability(exam: ExamSummary) {
  const now = Date.now();
  if (exam.available_from && now < new Date(exam.available_from).getTime()) {
    return { label: `Opens ${new Date(exam.available_from).toLocaleString()}`, tone: "warning" as const };
  }
  if (exam.available_until && now > new Date(exam.available_until).getTime()) {
    return { label: `Closed ${new Date(exam.available_until).toLocaleString()}`, tone: "danger" as const };
  }
  if (exam.available_until) {
    return { label: `Open until ${new Date(exam.available_until).toLocaleString()}`, tone: "accent" as const };
  }
  return { label: null, tone: "accent" as const };
}

export function SubjectExamAdmin() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState(false);
  const [examToDelete, setExamToDelete] = useState<ExamSummary | null>(null);

  const { data: subjects, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const selected = subjects?.find((s) => s.id === selectedId) ?? null;

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["exams", selectedId],
    queryFn: () => fetchExams(selectedId as number),
    enabled: selectedId !== null,
  });

  const { register, handleSubmit, reset, formState } = useForm<SubjectFormValues>();
  const createMutation = useMutation({
    mutationFn: (values: SubjectFormValues) => createSubject(values.name, values.description, values.education_level),
    onSuccess: (subject) => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      reset();
      setSelectedId(subject.id);
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: number) => deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setSelectedId(null);
      setSubjectToDelete(false);
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ examId, isPublished }: { examId: number; isPublished: boolean }) =>
      setExamPublished(examId, isPublished),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exams", selectedId] }),
  });
  const duplicateMutation = useMutation({
    mutationFn: (examId: number) => duplicateExam(examId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exams", selectedId] }),
  });
  const deleteExamMutation = useMutation({
    mutationFn: (examId: number) => deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams", selectedId] });
      setExamToDelete(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <BookOpen size={24} className="text-accent-soft" /> Subjects &amp; exams
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Create subjects and manage their exams.</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Card className="flex w-full shrink-0 flex-col gap-3 lg:w-80">
          <h2 className="text-sm font-semibold text-ink">Subjects</h2>
          {isLoading && <Loader label="Loading..." />}
          <div className="flex flex-col gap-1">
            {subjects?.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  selectedId === s.id ? "bg-accent/10 text-ink" : "text-ink-muted hover:bg-black/5",
                )}
              >
                <span className="truncate font-medium">{s.name}</span>
                {s.education_level && (
                  <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                    {EDUCATION_LEVEL_LABELS[s.education_level]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            className="flex flex-col gap-2 border-t border-black/10 pt-3"
          >
            <Input placeholder="Subject name" {...register("name", { required: true })} />
            <Textarea placeholder="Description (optional)" rows={2} {...register("description")} />
            <Select {...register("education_level")}>
              <option value="">Visible to everyone</option>
              {(Object.entries(EDUCATION_LEVEL_LABELS) as [EducationLevel, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} only
                </option>
              ))}
            </Select>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              disabled={!formState.isValid}
              className="w-full text-sm"
            >
              <Plus size={14} /> Add subject
            </Button>
          </form>
        </Card>

        {selected && (
          <div className="flex flex-1 flex-col gap-4">
            <Card className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">{selected.name}</h2>
                <p className="text-xs text-ink-faint">
                  {selected.exam_count} exam{selected.exam_count === 1 ? "" : "s"} &middot; {selected.pdf_count} PDF
                  {selected.pdf_count === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                variant="outline"
                className="text-danger hover:bg-danger/10"
                onClick={() => setSubjectToDelete(true)}
              >
                <Trash2 size={14} /> Delete subject
              </Button>
            </Card>

            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Exams</h3>
                <Link to={`/subjects/${selected.id}/exams/new`}>
                  <Button className="text-sm">
                    <Plus size={14} /> New exam
                  </Button>
                </Link>
              </div>

              {examsLoading && <Loader label="Loading exams..." />}
              {!examsLoading && exams?.length === 0 && (
                <p className="py-6 text-center text-sm text-ink-muted">No exams yet.</p>
              )}

              <div className="flex flex-col gap-2">
                {exams?.map((exam) => {
                  const availability = examAvailability(exam);
                  return (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
                          <Target size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">{exam.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
                            <span className="flex items-center gap-1">
                              <HelpCircle size={12} /> {exam.question_count} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {exam.duration_minutes} min
                            </span>
                            {!exam.is_published && (
                              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">Draft</span>
                            )}
                            {exam.is_published && availability.label && (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5",
                                  availability.tone === "accent" && "bg-accent/10 text-accent-soft",
                                  availability.tone === "danger" && "bg-danger/10 text-danger",
                                  availability.tone === "warning" && "bg-warning/10 text-warning",
                                )}
                              >
                                {availability.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="outline"
                          isLoading={publishMutation.isPending}
                          onClick={() => publishMutation.mutate({ examId: exam.id, isPublished: !exam.is_published })}
                        >
                          {exam.is_published ? "Unpublish" : "Publish"}
                        </Button>
                        <button
                          onClick={() => duplicateMutation.mutate(exam.id)}
                          className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-accent/10 hover:text-accent-soft"
                          aria-label={`Duplicate ${exam.title}`}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => setExamToDelete(exam)}
                          className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
                          aria-label={`Delete ${exam.title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      <Modal open={subjectToDelete} onClose={() => setSubjectToDelete(false)} title="Delete subject?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            This will permanently delete <span className="font-medium text-ink">"{selected?.name}"</span> along with
            its exams, PDFs, and discussions. This can't be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setSubjectToDelete(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selected && deleteSubjectMutation.mutate(selected.id)}
              isLoading={deleteSubjectMutation.isPending}
              className="bg-danger hover:bg-danger/90"
            >
              <Trash2 size={15} /> Delete subject
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={examToDelete !== null} onClose={() => setExamToDelete(null)} title="Delete exam?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            This will permanently delete <span className="font-medium text-ink">"{examToDelete?.title}"</span> and
            every student's attempts on it. This can't be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setExamToDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => examToDelete && deleteExamMutation.mutate(examToDelete.id)}
              isLoading={deleteExamMutation.isPending}
              className="bg-danger hover:bg-danger/90"
            >
              <Trash2 size={15} /> Delete exam
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

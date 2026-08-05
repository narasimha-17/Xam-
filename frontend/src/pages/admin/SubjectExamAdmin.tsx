import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Clock, Copy, FileText, HelpCircle, Plus, Target, Trash2 } from "lucide-react";
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

// Same rotating-color language as Dashboard/Subjects, so this admin page reads as part of the
// same product instead of a flatter, monotone "admin panel" bolted on the side.
const TILE_ACCENTS = ["border-accent", "border-accent-soft", "border-warning", "border-success"];
const TILE_ICON_STYLES = [
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
];

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

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  iconStyle,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
  accent: string;
  iconStyle: string;
}) {
  return (
    <Card className={cn("flex items-center gap-4 border-l-4", accent)}>
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconStyle)}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div>
        <p className="font-display text-2xl font-semibold text-ink">{value}</p>
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}

export function SubjectExamAdmin() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState(false);
  const [examToDelete, setExamToDelete] = useState<ExamSummary | null>(null);

  const { data: subjects, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const selected = subjects?.find((s) => s.id === selectedId) ?? null;
  const selectedIndex = subjects?.findIndex((s) => s.id === selectedId) ?? -1;

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

  const totalExams = subjects?.reduce((sum, s) => sum + s.exam_count, 0) ?? 0;
  const totalPdfs = subjects?.reduce((sum, s) => sum + s.pdf_count, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <BookOpen size={24} className="text-accent-soft" /> Subjects &amp; exams
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Create subjects and manage their exams.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={BookOpen}
          label="Subjects"
          value={subjects?.length ?? 0}
          accent={TILE_ACCENTS[0]}
          iconStyle={TILE_ICON_STYLES[0]}
        />
        <StatTile
          icon={Target}
          label="Total exams"
          value={totalExams}
          accent={TILE_ACCENTS[1]}
          iconStyle={TILE_ICON_STYLES[1]}
        />
        <StatTile
          icon={FileText}
          label="Total PDFs"
          value={totalPdfs}
          accent={TILE_ACCENTS[2]}
          iconStyle={TILE_ICON_STYLES[2]}
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Card className="flex w-full shrink-0 flex-col gap-3 lg:w-96">
          <h2 className="text-sm font-semibold text-ink">Subjects</h2>
          {isLoading && <Loader label="Loading..." />}
          <div className="flex flex-col gap-1.5">
            {subjects?.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                  selectedId === s.id
                    ? "bg-accent/[0.08] shadow-glow ring-1 ring-accent/20"
                    : "hover:bg-black/5",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    TILE_ICON_STYLES[i % TILE_ICON_STYLES.length],
                  )}
                >
                  <BookOpen size={16} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{s.name}</span>
                  <span className="flex items-center gap-2 text-xs text-ink-faint">
                    {s.exam_count} exam{s.exam_count === 1 ? "" : "s"}
                    {s.education_level && (
                      <span className="rounded-full border border-accent-soft/40 bg-accent-soft/10 px-2 py-0.5 font-medium uppercase tracking-wide text-accent-soft">
                        {EDUCATION_LEVEL_LABELS[s.education_level]}
                      </span>
                    )}
                  </span>
                </div>
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

        {selected ? (
          <Card className="flex flex-1 flex-col gap-4">
            <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    TILE_ICON_STYLES[selectedIndex >= 0 ? selectedIndex % TILE_ICON_STYLES.length : 0],
                  )}
                >
                  <BookOpen size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-ink">{selected.name}</h2>
                    {selected.education_level && (
                      <span className="rounded-full border border-accent-soft/40 bg-accent-soft/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent-soft">
                        {EDUCATION_LEVEL_LABELS[selected.education_level]}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">
                    {selected.exam_count} exam{selected.exam_count === 1 ? "" : "s"} &middot; {selected.pdf_count} PDF
                    {selected.pdf_count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="shrink-0 text-danger hover:bg-danger/10"
                onClick={() => setSubjectToDelete(true)}
              >
                <Trash2 size={14} /> Delete subject
              </Button>
            </div>

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
              {exams?.map((exam, i) => {
                const availability = examAvailability(exam);
                return (
                  <div
                    key={exam.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/10 p-3 transition-colors hover:border-accent/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          TILE_ICON_STYLES[i % TILE_ICON_STYLES.length],
                        )}
                      >
                        <Target size={16} strokeWidth={1.75} />
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
        ) : (
          <Card className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
            <BookOpen size={28} className="text-ink-faint" />
            <p className="text-sm text-ink-muted">Pick a subject on the left to manage its exams.</p>
          </Card>
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

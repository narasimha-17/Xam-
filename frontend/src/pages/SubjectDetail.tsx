import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Copy,
  Download,
  FileText,
  HelpCircle,
  MessagesSquare,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { fetchSubject } from "../lib/subjects";
import { fetchPdfs, openPdf, uploadPdf } from "../lib/pdfs";
import { deleteExam, duplicateExam, fetchExams, setExamPublished } from "../lib/exams";
import type { ExamSummary, Pdf } from "../types/api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { Loader } from "../components/ui/Loader";
import { SearchInput } from "../components/ui/SearchInput";
import { AiExplainModal } from "../components/ai/AiExplainModal";

interface PdfFormValues {
  title: string;
  topicId: string;
}

function examAvailability(exam: { available_from: string | null; available_until: string | null }) {
  const now = Date.now();
  if (exam.available_from && now < new Date(exam.available_from).getTime()) {
    return { status: "not_open" as const, label: `Opens ${new Date(exam.available_from).toLocaleString()}` };
  }
  if (exam.available_until && now > new Date(exam.available_until).getTime()) {
    return { status: "closed" as const, label: `Closed ${new Date(exam.available_until).toLocaleString()}` };
  }
  if (exam.available_until) {
    return { status: "open" as const, label: `Open until ${new Date(exam.available_until).toLocaleString()}` };
  }
  return { status: "open" as const, label: null };
}

export function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const subjectId = Number(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [openingPdfId, setOpeningPdfId] = useState<number | null>(null);
  const [examSearch, setExamSearch] = useState("");
  const [examToDelete, setExamToDelete] = useState<ExamSummary | null>(null);
  const [topicExplainerOpen, setTopicExplainerOpen] = useState(false);
  const [pdfToExplain, setPdfToExplain] = useState<Pdf | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: subject, isLoading: subjectLoading } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: () => fetchSubject(subjectId),
    enabled: !Number.isNaN(subjectId),
  });

  const { data: pdfs, isLoading: pdfsLoading } = useQuery({
    queryKey: ["pdfs", subjectId],
    queryFn: () => fetchPdfs(subjectId),
    enabled: !Number.isNaN(subjectId),
  });

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["exams", subjectId],
    queryFn: () => fetchExams(subjectId),
    enabled: !Number.isNaN(subjectId),
  });

  const filteredExams = exams?.filter((e) => e.title.toLowerCase().includes(examSearch.trim().toLowerCase()));

  const publishMutation = useMutation({
    mutationFn: ({ examId, isPublished }: { examId: number; isPublished: boolean }) =>
      setExamPublished(examId, isPublished),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exams", subjectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (examId: number) => deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams", subjectId] });
      setExamToDelete(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (examId: number) => duplicateExam(examId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exams", subjectId] }),
  });

  const { register, handleSubmit, reset } = useForm<PdfFormValues>();

  const uploadMutation = useMutation({
    mutationFn: (values: PdfFormValues) => {
      const file = fileInputRef.current?.files?.[0];
      if (!file) throw new Error("Choose a PDF file");
      return uploadPdf({
        subjectId,
        topicId: values.topicId ? Number(values.topicId) : null,
        title: values.title,
        file,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdfs", subjectId] });
      setModalOpen(false);
      reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  async function handleOpenPdf(pdfId: number) {
    setOpeningPdfId(pdfId);
    try {
      await openPdf(pdfId);
    } finally {
      setOpeningPdfId(null);
    }
  }

  if (subjectLoading) return <Loader className="py-24" label="Loading subject..." />;
  if (!subject) return <Card className="py-16 text-center text-sm text-ink-muted">Subject not found.</Card>;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/subjects" className="flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to subjects
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{subject.name}</h1>
          {subject.description && <p className="mt-1 text-sm text-ink-muted">{subject.description}</p>}
        </div>
        <Button variant="outline" onClick={() => setTopicExplainerOpen(true)}>
          <Sparkles size={16} /> Explain a topic
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Exams</h2>
        {user?.role === "admin" && (
          <Link to={`/subjects/${subjectId}/exams/new`}>
            <Button>
              <Plus size={16} /> New exam
            </Button>
          </Link>
        )}
      </div>

      {!examsLoading && exams && exams.length > 0 && (
        <SearchInput value={examSearch} onChange={setExamSearch} placeholder="Search exams..." className="max-w-sm" />
      )}

      {examsLoading && <Loader className="py-8" label="Loading exams..." />}
      {!examsLoading && exams?.length === 0 && (
        <Card className="py-10 text-center text-sm text-ink-muted">No exams yet.</Card>
      )}
      {!examsLoading && exams && exams.length > 0 && filteredExams?.length === 0 && (
        <Card className="py-10 text-center text-sm text-ink-muted">No exams match "{examSearch}".</Card>
      )}

      <div className="flex flex-col gap-3">
        {filteredExams?.map((exam) => {
          const availability = examAvailability(exam);
          return (
            <Card key={exam.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
                  <Target size={18} />
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
                        className={`rounded-full px-2 py-0.5 ${
                          availability.status === "open" ? "bg-accent/10 text-accent-soft" : "bg-danger/10 text-danger"
                        }`}
                      >
                        {availability.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {user?.role === "admin" ? (
                <div className="flex items-center gap-2">
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
              ) : (
                exam.is_published &&
                (availability.status === "open" ? (
                  <Link to={`/exams/${exam.id}/take`}>
                    <Button>Start exam</Button>
                  </Link>
                ) : (
                  <Button disabled variant="outline">
                    {availability.status === "not_open" ? "Not open yet" : "Closed"}
                  </Button>
                ))
              )}
            </Card>
          );
        })}
      </div>

      <Link to={`/subjects/${subjectId}/discussion`}>
        <Card className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
              <MessagesSquare size={18} />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-ink">Discussion</p>
              <p className="text-xs text-ink-muted">Ask questions and see replies</p>
            </div>
          </div>
        </Card>
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Study material</h2>
        {user?.role === "admin" && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Upload PDF
          </Button>
        )}
      </div>

      {pdfsLoading && <Loader className="py-12" label="Loading PDFs..." />}
      {!pdfsLoading && pdfs?.length === 0 && (
        <Card className="py-12 text-center text-sm text-ink-muted">No PDFs uploaded yet.</Card>
      )}

      <div className="flex flex-col gap-3">
        {pdfs?.map((pdf) => (
          <Card key={pdf.id} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{pdf.title}</p>
                <p className="text-xs text-ink-faint">{new Date(pdf.uploaded_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPdfToExplain(pdf)}>
                <Sparkles size={15} /> Explain
              </Button>
              <Button variant="outline" isLoading={openingPdfId === pdf.id} onClick={() => handleOpenPdf(pdf.id)}>
                <Download size={15} /> Open
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload PDF">
        <form
          onSubmit={handleSubmit((values) => uploadMutation.mutate(values))}
          className="flex flex-col gap-4"
        >
          <Input label="Title" placeholder="e.g. Unit 3 Notes" {...register("title", { required: true })} />
          {subject.topics.length > 0 && (
            <Select label="Topic (optional)" {...register("topicId")}>
              <option value="">No specific topic</option>
              {subject.topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </Select>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-ink-muted">PDF file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              required
              className="rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-accent-soft"
            />
          </div>
          {uploadMutation.isError && (
            <p className="text-sm text-danger">Upload failed. Check the file and try again.</p>
          )}
          <Button type="submit" isLoading={uploadMutation.isPending} className="w-full">
            <Upload size={16} /> Upload
          </Button>
        </form>
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
              onClick={() => examToDelete && deleteMutation.mutate(examToDelete.id)}
              isLoading={deleteMutation.isPending}
              className="bg-danger hover:bg-danger/90"
            >
              <Trash2 size={15} /> Delete exam
            </Button>
          </div>
        </div>
      </Modal>

      <AiExplainModal
        open={topicExplainerOpen}
        onClose={() => setTopicExplainerOpen(false)}
        source={{ kind: "topic", subjectId }}
      />
      {pdfToExplain && (
        <AiExplainModal
          open
          onClose={() => setPdfToExplain(null)}
          source={{ kind: "pdf", pdfId: pdfToExplain.id, pdfTitle: pdfToExplain.title }}
        />
      )}
    </div>
  );
}

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import { fetchSubjects } from "../../lib/subjects";
import { deletePdf, fetchPdfs, uploadPdf } from "../../lib/pdfs";
import type { Pdf } from "../../types/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Loader } from "../../components/ui/Loader";

interface PdfFormValues {
  subjectId: string;
  topicId: string;
  title: string;
}

export function PdfAdmin() {
  const queryClient = useQueryClient();
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<Pdf | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: pdfs, isLoading } = useQuery({
    queryKey: ["pdfs-admin", subjectFilter],
    queryFn: () => fetchPdfs(subjectFilter ? Number(subjectFilter) : undefined),
  });

  const { register, handleSubmit, reset, watch } = useForm<PdfFormValues>();
  const watchedSubjectId = watch("subjectId");
  const topicsForForm = subjects?.find((s) => String(s.id) === watchedSubjectId)?.topics ?? [];

  const uploadMutation = useMutation({
    mutationFn: (values: PdfFormValues) => {
      const file = fileInputRef.current?.files?.[0];
      if (!file) throw new Error("Choose a PDF file");
      return uploadPdf({
        subjectId: Number(values.subjectId),
        topicId: values.topicId ? Number(values.topicId) : null,
        title: values.title,
        file,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdfs-admin"] });
      setModalOpen(false);
      reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePdf(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdfs-admin"] });
      setPdfToDelete(null);
    },
  });

  function subjectName(subjectId: number) {
    return subjects?.find((s) => s.id === subjectId)?.name ?? "Unknown subject";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <FileText size={24} className="text-accent-soft" /> PDF library
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Upload and manage study material across every subject.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="w-fit shrink-0">
          <Plus size={16} /> Upload PDF
        </Button>
      </div>

      <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="max-w-xs">
        <option value="">All subjects</option>
        {subjects?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>

      {isLoading && <Loader className="py-16" label="Loading PDFs..." />}
      {!isLoading && pdfs?.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">No PDFs uploaded yet.</Card>
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
                <p className="text-xs text-ink-faint">
                  {subjectName(pdf.subject_id)} &middot; {new Date(pdf.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPdfToDelete(pdf)}
              className="shrink-0 rounded-lg p-2 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label={`Delete ${pdf.title}`}
            >
              <Trash2 size={16} />
            </button>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload PDF">
        <form onSubmit={handleSubmit((values) => uploadMutation.mutate(values))} className="flex flex-col gap-4">
          <Select label="Subject" {...register("subjectId", { required: true })}>
            <option value="">Select a subject</option>
            {subjects?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input label="Title" placeholder="e.g. Unit 3 Notes" {...register("title", { required: true })} />
          {topicsForForm.length > 0 && (
            <Select label="Topic (optional)" {...register("topicId")}>
              <option value="">No specific topic</option>
              {topicsForForm.map((topic) => (
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

      <Modal open={pdfToDelete !== null} onClose={() => setPdfToDelete(null)} title="Delete PDF?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            This will permanently delete <span className="font-medium text-ink">"{pdfToDelete?.title}"</span>. This
            can't be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setPdfToDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => pdfToDelete && deleteMutation.mutate(pdfToDelete.id)}
              isLoading={deleteMutation.isPending}
              className="bg-danger hover:bg-danger/90"
            >
              <Trash2 size={15} /> Delete PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

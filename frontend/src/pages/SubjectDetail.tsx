import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Download, FileText, HelpCircle, MessagesSquare, Sparkles, Target } from "lucide-react";
import { fetchSubject } from "../lib/subjects";
import { fetchPdfs, openPdf } from "../lib/pdfs";
import { fetchExams } from "../lib/exams";
import type { Pdf } from "../types/api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Loader } from "../components/ui/Loader";
import { SearchInput } from "../components/ui/SearchInput";
import { AiExplainModal } from "../components/ai/AiExplainModal";

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
  const [openingPdfId, setOpeningPdfId] = useState<number | null>(null);
  const [examSearch, setExamSearch] = useState("");
  const [topicExplainerOpen, setTopicExplainerOpen] = useState(false);
  const [pdfToExplain, setPdfToExplain] = useState<Pdf | null>(null);

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

      <h2 className="font-display text-lg font-semibold text-ink">Exams</h2>

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
              {exam.is_published &&
                (availability.status === "open" ? (
                  <Link to={`/exams/${exam.id}/take`}>
                    <Button>Start exam</Button>
                  </Link>
                ) : (
                  <Button disabled variant="outline">
                    {availability.status === "not_open" ? "Not open yet" : "Closed"}
                  </Button>
                ))}
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

      <h2 className="font-display text-lg font-semibold text-ink">Study material</h2>

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

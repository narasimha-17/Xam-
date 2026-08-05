import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, FileText, Target } from "lucide-react";
import { fetchSubjects } from "../lib/subjects";
import { Card } from "../components/ui/Card";
import { Loader } from "../components/ui/Loader";
import { SearchInput } from "../components/ui/SearchInput";
import type { EducationLevel } from "../types/api";

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  school: "School",
  college: "College",
  engineering: "Engineering",
};

// Rotating tile colors so the catalog reads as a colorful course grid, Whizlabs-style.
const TILE_STYLES = [
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
];

export function Subjects() {
  const [search, setSearch] = useState("");

  const { data: subjects, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  const filteredSubjects = subjects?.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Subjects</h1>
        <p className="mt-1 text-sm text-ink-muted">Browse engineering subjects to practice.</p>
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
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-ink">{subject.name}</h3>
                  {subject.education_level && (
                    <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                      {EDUCATION_LEVEL_LABELS[subject.education_level]}
                    </span>
                  )}
                </div>
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
    </div>
  );
}

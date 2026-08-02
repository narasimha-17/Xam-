import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MessagesSquare } from "lucide-react";
import { fetchSubjects } from "../lib/subjects";
import { Card } from "../components/ui/Card";
import { Loader } from "../components/ui/Loader";
import { SearchInput } from "../components/ui/SearchInput";

const TILE_STYLES = [
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
];

export function Discussion() {
  const { data: subjects, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const [search, setSearch] = useState("");

  const filteredSubjects = subjects?.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Discussion</h1>
        <p className="mt-1 text-sm text-ink-muted">Pick a subject to ask questions or help others.</p>
      </div>

      {!isLoading && subjects && subjects.length > 0 && (
        <SearchInput value={search} onChange={setSearch} placeholder="Search subjects..." className="max-w-sm" />
      )}

      {isLoading && <Loader className="py-16" label="Loading subjects..." />}

      {!isLoading && subjects && subjects.length > 0 && filteredSubjects?.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">No subjects match "{search}".</Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects?.map((subject, index) => (
          <Link key={subject.id} to={`/subjects/${subject.id}/discussion`}>
            <Card className="flex h-full flex-col gap-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${TILE_STYLES[index % TILE_STYLES.length]}`}
              >
                <MessagesSquare size={20} strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{subject.name}</h3>
                {subject.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{subject.description}</p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

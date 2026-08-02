import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Flame, MessagesSquare, Puzzle, Target, TrendingUp } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { fetchSubjects } from "../lib/subjects";
import { fetchMyProgress } from "../lib/progress";
import { fetchPuzzleStreak, fetchTodayPuzzle } from "../lib/puzzles";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { QuoteBanner } from "../components/ui/QuoteBanner";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const TILE_ACCENTS = ["border-accent", "border-accent-soft", "border-warning", "border-success"];
const TILE_ICON_STYLES = [
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
];

export function Dashboard() {
  const { user } = useAuth();

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
  });
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["progress"],
    queryFn: fetchMyProgress,
  });
  const { data: todayPuzzle } = useQuery({
    queryKey: ["puzzle-today"],
    queryFn: fetchTodayPuzzle,
  });
  const { data: puzzleStreak } = useQuery({
    queryKey: ["puzzle-streak"],
    queryFn: fetchPuzzleStreak,
  });

  const isLoading = subjectsLoading || progressLoading;
  const examsAvailable = subjects?.reduce((sum, s) => sum + s.exam_count, 0) ?? 0;

  const stats = [
    { label: "Subjects", value: subjects?.length ?? 0, icon: BookOpen },
    { label: "Exams available", value: examsAvailable, icon: MessagesSquare },
    { label: "Exams attempted", value: progress?.total_attempts ?? 0, icon: Target },
    { label: "Average score", value: `${progress?.average_score_pct ?? 0}%`, icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col gap-6">
      <QuoteBanner />

      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {greeting()}, {user?.full_name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Here's a snapshot of your practice activity.</p>
      </div>

      {isLoading ? (
        <Loader className="py-8" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }, i) => (
            <Card key={label} className={`flex items-center gap-4 border-l-4 ${TILE_ACCENTS[i]}`}>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TILE_ICON_STYLES[i]}`}>
                <Icon size={20} strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-ink">{value}</p>
                <p className="text-xs text-ink-muted">{label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="flex items-center justify-between bg-accent/[0.06]">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Ready to practice?</h2>
          <p className="mt-1 text-sm text-ink-muted">Browse subjects for exams, study material, and discussions.</p>
        </div>
        <Link to="/subjects">
          <Button>Browse subjects</Button>
        </Link>
      </Card>

      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <Puzzle size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              {todayPuzzle?.already_solved ? "Today's puzzle is done" : "Today's brain teaser"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {todayPuzzle?.already_solved
                ? "Nice work — come back tomorrow for a new one."
                : "A quick logic puzzle to sharpen your thinking, no grade attached."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {puzzleStreak && puzzleStreak.current_streak > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-ink-muted">
              <Flame size={16} className="text-warning" />
              <span className="font-medium text-ink">{puzzleStreak.current_streak}</span> day streak
            </div>
          )}
          <Link to="/puzzle">
            <Button variant={todayPuzzle?.already_solved ? "outline" : "primary"}>
              {todayPuzzle?.already_solved ? "View result" : "Solve it"}
            </Button>
          </Link>
        </div>
      </Card>

      {!isLoading && subjects && subjects.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Your subjects</h2>
            <Link to="/subjects" className="flex items-center gap-1 text-sm text-accent-soft hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.slice(0, 3).map((subject, i) => (
              <Link key={subject.id} to={`/subjects/${subject.id}`}>
                <Card className="flex h-full flex-col gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TILE_ICON_STYLES[i % TILE_ICON_STYLES.length]}`}>
                    <BookOpen size={18} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink">{subject.name}</h3>
                    {subject.description && (
                      <p className="mt-1 line-clamp-1 text-sm text-ink-muted">{subject.description}</p>
                    )}
                  </div>
                  <p className="mt-auto text-xs text-ink-faint">
                    {subject.exam_count} exam{subject.exam_count === 1 ? "" : "s"} · {subject.pdf_count} PDF
                    {subject.pdf_count === 1 ? "" : "s"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

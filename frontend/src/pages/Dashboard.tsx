import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  Flame,
  MessagesSquare,
  PlayCircle,
  Puzzle,
  Radio,
  Target,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { fetchSubjects } from "../lib/subjects";
import { fetchMyBadges, fetchMyProgress } from "../lib/progress";
import { fetchPuzzleStreak, fetchTodayPuzzle } from "../lib/puzzles";
import { fetchStudyEvents } from "../lib/studyEvents";
import { fetchAiRadarItems } from "../lib/aiRadar";
import { fetchCourses } from "../lib/courses";
import { fetchMyResume } from "../lib/resume";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { QuoteBanner } from "../components/ui/QuoteBanner";
import { ScoreTrendLine } from "../components/charts/ScoreTrendLine";
import { PlatformDashboard } from "./admin/PlatformDashboard";

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

function resumeCompleteness(resume: {
  full_name: string;
  summary: string;
  education: unknown[];
  experience: unknown[];
  projects: unknown[];
  skills: string[];
} | null): number {
  if (!resume) return 0;
  const checks = [
    Boolean(resume.full_name),
    Boolean(resume.summary),
    resume.education.length > 0,
    resume.experience.length > 0 || resume.projects.length > 0,
    resume.skills.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "admin") {
    return <PlatformDashboard />;
  }
  return <StudentDashboard />;
}

function StudentDashboard() {
  const { user } = useAuth();

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
  });
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["progress"],
    queryFn: fetchMyProgress,
  });
  const { data: badges } = useQuery({ queryKey: ["badges"], queryFn: fetchMyBadges });
  const { data: todayPuzzle } = useQuery({
    queryKey: ["puzzle-today"],
    queryFn: fetchTodayPuzzle,
  });
  const allPuzzlesSolved = !!todayPuzzle && todayPuzzle.solved_count >= todayPuzzle.required_count;
  const { data: puzzleStreak } = useQuery({
    queryKey: ["puzzle-streak"],
    queryFn: fetchPuzzleStreak,
  });
  const { data: upcomingEvents } = useQuery({
    queryKey: ["study-events", "upcoming"],
    queryFn: () => fetchStudyEvents(),
  });
  const { data: aiRadarItems } = useQuery({ queryKey: ["ai-radar"], queryFn: fetchAiRadarItems });
  const { data: courses } = useQuery({ queryKey: ["courses", false], queryFn: fetchCourses });
  const { data: resume } = useQuery({ queryKey: ["my-resume"], queryFn: fetchMyResume });

  const isLoading = subjectsLoading || progressLoading;
  const examsAvailable = subjects?.reduce((sum, s) => sum + s.exam_count, 0) ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const nextEvents = (upcomingEvents ?? []).filter((e) => e.event_date >= today).slice(0, 3);
  const latestAiNews = aiRadarItems?.[0] ?? null;
  const resumePct = resumeCompleteness(resume ?? null);

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

      {!isLoading && progress && progress.total_attempts > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="flex flex-col gap-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Score trend</h2>
              <Link to="/progress" className="flex items-center gap-1 text-sm text-accent-soft hover:underline">
                Full progress <ArrowRight size={14} />
              </Link>
            </div>
            <ScoreTrendLine history={progress.history} />
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-ink">Badges</h2>
            {badges && badges.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
                {badges.slice(0, 4).map((badge) => (
                  <div key={badge.code} className="flex flex-col items-center gap-1 text-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                        badge.earned ? "bg-accent/15 text-accent-soft" : "bg-black/5 text-ink-faint"
                      }`}
                    >
                      {badge.name.slice(0, 1)}
                    </div>
                    <p className="text-[11px] leading-tight text-ink-muted">{badge.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Keep practicing to earn your first badge.</p>
            )}
          </Card>
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
              {allPuzzlesSolved ? "Today's puzzles are done" : "Today's brain teasers"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {todayPuzzle
                ? allPuzzlesSolved
                  ? "Nice work — come back tomorrow for a new set."
                  : `${todayPuzzle.solved_count} of ${todayPuzzle.required_count} solved — finish them all to keep your streak.`
                : "A quick set of logic puzzles to sharpen your thinking, no grade attached."}
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
            <Button variant={allPuzzlesSolved ? "outline" : "primary"}>
              {allPuzzlesSolved ? "View results" : "Solve them"}
            </Button>
          </Link>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-ink">Discover</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/ai-radar">
            <Card className="flex h-full flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-soft">
                <Radio size={18} strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">AI Radar</h3>
                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                  {latestAiNews ? latestAiNews.title : "Daily AI/model-release news, with real-world use cases."}
                </p>
              </div>
            </Card>
          </Link>
          <Link to="/courses">
            <Card className="flex h-full flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-soft">
                <PlayCircle size={18} strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">Courses</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  {courses && courses.length > 0
                    ? `${courses.length} video course${courses.length === 1 ? "" : "s"} ready to watch.`
                    : "Video courses built from YouTube — watch right here."}
                </p>
              </div>
            </Card>
          </Link>
          <Link to="/resume">
            <Card className="flex h-full flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-soft">
                <FileText size={18} strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">Resume builder</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  {resumePct === 0
                    ? "Build your resume and check its ATS score."
                    : resumePct >= 100
                      ? "Resume complete — check your ATS score."
                      : `${resumePct}% complete — keep going.`}
                </p>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {nextEvents.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Upcoming study sessions</h2>
            <Link to="/planner" className="flex items-center gap-1 text-sm text-accent-soft hover:underline">
              Open planner <ArrowRight size={14} />
            </Link>
          </div>
          <Card className="flex flex-col divide-y divide-black/5">
            {nextEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
                  <CalendarDays size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{event.title}</p>
                  <p className="text-xs text-ink-faint">
                    {new Date(event.event_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {event.start_time && ` · ${event.start_time.slice(0, 5)}`}
                    {event.subject_name && ` · ${event.subject_name}`}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

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

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Target, TrendingUp } from "lucide-react";
import { fetchMyBadges, fetchMyProgress } from "../lib/progress";
import { Card } from "../components/ui/Card";
import { Loader } from "../components/ui/Loader";
import { ScoreTrendLine } from "../components/charts/ScoreTrendLine";
import { SubjectScoreBars } from "../components/charts/SubjectScoreBars";
import { BadgeShelf } from "../components/ui/BadgeShelf";

export function Progress() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["progress"], queryFn: fetchMyProgress });
  const { data: badges } = useQuery({ queryKey: ["badges"], queryFn: fetchMyBadges });

  if (isLoading) return <Loader className="py-24" label="Loading progress..." />;

  if (!stats || stats.total_attempts === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Progress</h1>
          <p className="mt-1 text-sm text-ink-muted">Your practice performance over time.</p>
        </div>
        <Card className="py-16 text-center text-sm text-ink-muted">
          No exam attempts yet.{" "}
          <Link to="/subjects" className="text-accent-soft hover:underline">
            Browse subjects
          </Link>{" "}
          to take your first practice exam.
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Progress</h1>
        <p className="mt-1 text-sm text-ink-muted">Your practice performance over time.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
            <Target size={18} />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-ink">{stats.total_attempts}</p>
            <p className="text-xs text-ink-muted">Exams attempted</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-ink">{stats.average_score_pct}%</p>
            <p className="text-xs text-ink-muted">Average score</p>
          </div>
        </Card>
      </div>

      {stats.history.length > 1 && (
        <Card>
          <h2 className="mb-1 font-display text-lg font-semibold text-ink">Score trend</h2>
          <p className="mb-4 text-sm text-ink-muted">Every submitted attempt, in order.</p>
          <ScoreTrendLine history={stats.history} />
        </Card>
      )}

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">By subject</h2>
        <SubjectScoreBars subjects={stats.subjects} />
      </Card>

      {badges && (
        <div>
          <h2 className="mb-1 font-display text-lg font-semibold text-ink">Badges</h2>
          <p className="mb-4 text-sm text-ink-muted">Earned by attempting exams and keeping a daily streak.</p>
          <BadgeShelf badges={badges} />
        </div>
      )}
    </div>
  );
}

import { Flame, Footprints, Medal, Star, Target, Trophy, type LucideIcon } from "lucide-react";
import type { Badge } from "../../types/api";
import { Card } from "./Card";

const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  target: Target,
  trophy: Trophy,
  medal: Medal,
  flame: Flame,
  star: Star,
};

export function BadgeShelf({ badges }: { badges: Badge[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {badges.map((badge) => {
        const Icon = ICONS[badge.icon] ?? Trophy;
        const pct = Math.min(100, Math.round((badge.progress_current / badge.progress_target) * 100));
        return (
          <Card
            key={badge.code}
            className={badge.earned ? "flex flex-col items-center gap-2 text-center" : "flex flex-col items-center gap-2 text-center opacity-60"}
          >
            <div
              className={
                badge.earned
                  ? "flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent-soft"
                  : "flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-ink-faint"
              }
            >
              <Icon size={22} />
            </div>
            <p className="text-sm font-medium text-ink">{badge.name}</p>
            <p className="text-xs text-ink-muted">{badge.description}</p>
            {!badge.earned && (
              <div className="mt-1 w-full">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                  <div className="h-full rounded-full bg-accent/50" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-ink-faint">
                  {badge.progress_current}/{badge.progress_target}
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

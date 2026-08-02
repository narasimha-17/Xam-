import { Clock3 } from "lucide-react";
import { Card } from "./Card";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
        <Clock3 size={22} />
      </div>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="max-w-xs text-sm text-ink-muted">{description}</p>
    </Card>
  );
}

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "../../lib/utils";

export function StarRating({
  value,
  onChange,
  size = 20,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const interactive = Boolean(onChange);
  const display = hovered ?? value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => interactive && setHovered(n)}
          className={cn(!interactive && "cursor-default")}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            size={size}
            className={n <= display ? "fill-warning text-warning" : "fill-none text-ink-faint"}
          />
        </button>
      ))}
    </div>
  );
}

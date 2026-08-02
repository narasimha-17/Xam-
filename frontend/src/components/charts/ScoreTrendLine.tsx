import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AttemptHistoryEntry } from "../../types/api";

const PAD = { top: 16, right: 16, bottom: 28, left: 34 };
const HEIGHT = 220;
const GRID_STEPS = [0, 25, 50, 75, 100];

function statusColor(pct: number) {
  if (pct >= 75) return "var(--color-success)";
  if (pct >= 50) return "var(--color-warning)";
  return "var(--color-danger)";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ScoreTrendLine({ history }: { history: AttemptHistoryEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = Math.max(width - PAD.left - PAD.right, 10);
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const points = useMemo(
    () =>
      history.map((h, i) => {
        const x = PAD.left + (history.length > 1 ? (i / (history.length - 1)) * innerW : innerW / 2);
        const y = PAD.top + innerH - (Math.min(100, h.score_pct) / 100) * innerH;
        return { x, y, entry: h };
      }),
    [history, innerW, innerH],
  );

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${PAD.top + innerH} L${points[0].x},${PAD.top + innerH} Z`
      : "";

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;
  const last = points[points.length - 1];

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - relX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  }

  if (history.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-success)" }} />
          75%+ strong
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-warning)" }} />
          50–74% okay
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-danger)" }} />
          below 50%
        </span>
      </div>

      <div ref={containerRef} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIdx(null)}
          className="overflow-visible"
        >
          {GRID_STEPS.map((step) => {
            const y = PAD.top + innerH - (step / 100) * innerH;
            return (
              <g key={step}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={y}
                  y2={y}
                  stroke="rgba(32,26,20,0.08)"
                  strokeWidth={1}
                />
                <text x={PAD.left - 8} y={y + 3} textAnchor="end" fontSize={10} fill="var(--color-ink-faint)">
                  {step}%
                </text>
              </g>
            );
          })}

          {hovered && (
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="rgba(32,26,20,0.18)"
              strokeWidth={1}
            />
          )}

          <path d={areaPath} fill="var(--color-accent)" opacity={0.1} />
          <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <circle
              key={p.entry.attempt_id}
              cx={p.x}
              cy={p.y}
              r={i === hoverIdx ? 6 : 4}
              fill={statusColor(p.entry.score_pct)}
              stroke="var(--color-base-panel)"
              strokeWidth={2}
              style={{ transition: "r 0.1s ease" }}
            />
          ))}

          {last && (
            <text x={last.x} y={last.y - 12} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--color-ink)">
              {last.entry.score_pct}%
            </text>
          )}

          <text x={PAD.left} y={HEIGHT - 8} fontSize={10} fill="var(--color-ink-faint)">
            {formatDate(history[0].submitted_at)}
          </text>
          <text x={PAD.left + innerW} y={HEIGHT - 8} textAnchor="end" fontSize={10} fill="var(--color-ink-faint)">
            {formatDate(history[history.length - 1].submitted_at)}
          </text>
        </svg>

        {hovered && (
          <div
            className="glass pointer-events-none absolute z-10 flex flex-col gap-0.5 rounded-lg px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(hovered.x - 70, 0), width - 150),
              top: Math.max(hovered.y - 70, 0),
              width: 150,
            }}
          >
            <span className="font-semibold text-ink">{hovered.entry.score_pct}%</span>
            <span className="truncate text-ink-muted">{hovered.entry.exam_title}</span>
            <span className="text-ink-faint">{formatDate(hovered.entry.submitted_at)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

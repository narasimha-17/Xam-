import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SubjectProgress } from "../../types/api";

const ROW_HEIGHT = 40;
const BAR_HEIGHT = 14;
const LABEL_WIDTH = 160;
const RIGHT_PAD = 56;

function statusColor(pct: number) {
  if (pct >= 75) return "var(--color-success)";
  if (pct >= 50) return "var(--color-warning)";
  return "var(--color-danger)";
}

export function SubjectScoreBars({ subjects }: { subjects: SubjectProgress[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const navigate = useNavigate();

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

  const trackWidth = Math.max(width - LABEL_WIDTH - RIGHT_PAD, 40);
  const height = subjects.length * ROW_HEIGHT;

  return (
    <div ref={containerRef} className="w-full">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {subjects.map((s, i) => {
          const y = i * ROW_HEIGHT;
          const barW = (Math.min(100, s.average_score_pct) / 100) * trackWidth;
          const isHovered = hoverId === s.subject_id;
          return (
            <g
              key={s.subject_id}
              onPointerEnter={() => setHoverId(s.subject_id)}
              onPointerLeave={() => setHoverId(null)}
              onClick={() => navigate(`/subjects/${s.subject_id}`)}
              className="cursor-pointer"
            >
              <text
                x={0}
                y={y + ROW_HEIGHT / 2 + 4}
                fontSize={12}
                fill="var(--color-ink)"
                fontWeight={isHovered ? 600 : 500}
              >
                {s.subject_name.length > 22 ? `${s.subject_name.slice(0, 21)}…` : s.subject_name}
              </text>

              <rect
                x={LABEL_WIDTH}
                y={y + (ROW_HEIGHT - BAR_HEIGHT) / 2}
                width={trackWidth}
                height={BAR_HEIGHT}
                rx={4}
                fill="rgba(32,26,20,0.06)"
              />
              <rect
                x={LABEL_WIDTH}
                y={y + (ROW_HEIGHT - BAR_HEIGHT) / 2}
                width={barW}
                height={BAR_HEIGHT}
                rx={4}
                fill={statusColor(s.average_score_pct)}
                opacity={isHovered ? 1 : 0.85}
                style={{ transition: "opacity 0.1s ease" }}
              />
              <text
                x={LABEL_WIDTH + trackWidth + 8}
                y={y + ROW_HEIGHT / 2 + 4}
                fontSize={12}
                fontWeight={600}
                fill="var(--color-ink)"
              >
                {s.average_score_pct}%
              </text>

              {isHovered && (
                <text
                  x={LABEL_WIDTH}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fontSize={11}
                  fill="var(--color-base-panel)"
                  opacity={barW > 60 ? 1 : 0}
                >
                  {s.attempts} attempt{s.attempts === 1 ? "" : "s"}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

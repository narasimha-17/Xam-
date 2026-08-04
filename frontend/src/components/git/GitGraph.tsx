import { currentCommitId, reachableCommitIds, type RepoState } from "../../lib/gitSim";

const LANE_COLORS = ["#1e3f66", "#e8a23d", "#2c8c86", "#7b5ea8", "#e0475c", "#2e9e6b"];
const X_STEP = 64;
const LANE_HEIGHT = 64;
const NODE_R = 8;
const PAD_X = 40;
const PAD_TOP = 30;

function laneColor(lane: number): string {
  if (lane < 0) return "#8b96a6";
  return LANE_COLORS[lane % LANE_COLORS.length];
}

export function GitGraph({ state }: { state: RepoState }) {
  const reachable = reachableCommitIds(state);
  const visibleIds = state.order.filter((id) => reachable.has(id));
  const xOf = new Map<string, number>();
  visibleIds.forEach((id, i) => xOf.set(id, PAD_X + i * X_STEP));

  const lanes = new Set<number>();
  for (const id of visibleIds) lanes.add(state.commits[id].lane);
  if (state.head.type === "detached") lanes.add(-1);
  for (const lane of Object.values(state.branchLanes)) lanes.add(lane);
  const laneList = [...lanes].sort((a, b) => a - b);
  const laneY = new Map<number, number>();
  laneList.forEach((lane, i) => laneY.set(lane, PAD_TOP + i * LANE_HEIGHT));

  const yOf = (lane: number) => laneY.get(lane) ?? PAD_TOP;
  const width = PAD_X * 2 + Math.max(visibleIds.length - 1, 0) * X_STEP + 40;
  const height = PAD_TOP * 2 + Math.max(laneList.length - 1, 0) * LANE_HEIGHT + 20;
  const activeId = currentCommitId(state);

  // Group branch (and HEAD) tags by the commit they point to, so multiple tags on one commit stack.
  const tagsByCommit = new Map<string, { label: string; color: string; dashed?: boolean }[]>();
  for (const [name, tip] of Object.entries(state.branches)) {
    if (!tip) continue;
    const list = tagsByCommit.get(tip) ?? [];
    list.push({ label: name, color: laneColor(state.branchLanes[name] ?? 0) });
    tagsByCommit.set(tip, list);
  }
  if (state.head.type === "detached") {
    const list = tagsByCommit.get(state.head.commitId) ?? [];
    list.push({ label: "HEAD", color: "#8b96a6", dashed: true });
    tagsByCommit.set(state.head.commitId, list);
  }

  const edges: { from: string; to: string }[] = [];
  for (const id of visibleIds) {
    for (const parent of state.commits[id].parents) {
      if (xOf.has(parent)) edges.push({ from: parent, to: id });
    }
  }

  if (visibleIds.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-black/15 text-sm text-ink-faint">
        No commits yet — run <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5 font-mono">git init</code> and{" "}
        <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5 font-mono">git commit</code> to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 bg-base-soft/40 p-2">
      <svg width={width} height={height} role="img" aria-label="Commit graph">
        {edges.map(({ from, to }, i) => {
          const x1 = xOf.get(from) as number;
          const y1 = yOf(state.commits[from].lane);
          const x2 = xOf.get(to) as number;
          const y2 = yOf(state.commits[to].lane);
          const color = laneColor(state.commits[to].lane);
          if (y1 === y2) {
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} />;
          }
          const midX = (x1 + x2) / 2;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0.85}
            />
          );
        })}

        {visibleIds.map((id) => {
          const commit = state.commits[id];
          const x = xOf.get(id) as number;
          const y = yOf(commit.lane);
          const color = laneColor(commit.lane);
          const tags = tagsByCommit.get(id) ?? [];
          return (
            <g key={id}>
              {id === activeId && <circle cx={x} cy={y} r={NODE_R + 5} fill="none" stroke={color} strokeWidth={2} opacity={0.4} />}
              <circle cx={x} cy={y} r={NODE_R} fill={color} stroke="#eef3f8" strokeWidth={2} />
              <text x={x} y={y + NODE_R + 16} textAnchor="middle" fontSize={10} fill="#55677d" fontFamily="monospace">
                {id}
              </text>
              {tags.map((tag, ti) => (
                <g key={tag.label} transform={`translate(${x + NODE_R + 8}, ${y - 8 + ti * 16})`}>
                  <rect
                    width={tag.label.length * 6.5 + 12}
                    height={14}
                    rx={7}
                    fill={tag.dashed ? "transparent" : tag.color}
                    stroke={tag.color}
                    strokeDasharray={tag.dashed ? "3 2" : undefined}
                    strokeWidth={1.5}
                  />
                  <text
                    x={(tag.label.length * 6.5 + 12) / 2}
                    y={10}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontWeight={600}
                    fill={tag.dashed ? tag.color : "#eef3f8"}
                    fontFamily="ui-sans-serif, system-ui"
                  >
                    {tag.label}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

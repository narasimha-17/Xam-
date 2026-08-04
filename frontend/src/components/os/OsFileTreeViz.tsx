import { File, Folder, FolderOpen } from "lucide-react";
import type { DirNode, FsNode, OsState } from "../../lib/osSim";
import { cn } from "../../lib/utils";

function TreeNode({
  name,
  node,
  path,
  cwd,
}: {
  name: string;
  node: FsNode;
  path: string[];
  cwd: string[];
}) {
  const isCwd = path.length === cwd.length && path.every((p, i) => p === cwd[i]);
  const isAncestorOfCwd = path.every((p, i) => p === cwd[i]) && path.length < cwd.length;

  if (node.type === "file") {
    return (
      <div className="flex items-center gap-1.5 py-0.5 pl-5 text-sm text-ink-muted">
        <File size={13} className="shrink-0 text-ink-faint" />
        {name}
      </div>
    );
  }

  const entries = Object.entries(node.children).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded py-0.5 pl-2 text-sm font-medium",
          isCwd ? "bg-accent/10 text-accent" : isAncestorOfCwd ? "text-ink" : "text-ink-muted",
        )}
      >
        {isCwd ? <FolderOpen size={13} className="shrink-0 text-accent-soft" /> : <Folder size={13} className="shrink-0 text-accent-soft" />}
        {name}
        {isCwd && <span className="text-xs font-normal text-ink-faint">(current)</span>}
      </div>
      <div className="ml-3 border-l border-black/10 pl-2">
        {entries.map(([childName, child]) => (
          <TreeNode key={childName} name={childName} node={child} path={[...path, childName]} cwd={cwd} />
        ))}
      </div>
    </div>
  );
}

export function OsFileTreeViz({ state }: { state: OsState }) {
  const root: DirNode = state.root;
  return (
    <div className="rounded-xl border border-black/10 bg-base-soft/40 p-3">
      <TreeNode name="/" node={root} path={[]} cwd={state.cwd} />
    </div>
  );
}

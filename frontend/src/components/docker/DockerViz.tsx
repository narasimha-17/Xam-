import { Box, Layers } from "lucide-react";
import { imageRef, type DockerState } from "../../lib/dockerSim";
import { cn } from "../../lib/utils";

export function DockerViz({ state }: { state: DockerState }) {
  if (state.images.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-black/15 text-sm text-ink-faint">
        No images yet — run <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5 font-mono">docker build -t myapp .</code>{" "}
        to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-base-soft/40 p-3">
      {state.images.map((image) => {
        const ref = imageRef(image);
        const containers = state.containers.filter((c) => c.image === ref);
        return (
          <div key={ref} className="rounded-xl border border-black/10 bg-base-panel p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <Layers size={16} className="text-accent-soft" />
              {ref}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {containers.length === 0 && (
                <span className="text-xs text-ink-faint">No containers running from this image yet</span>
              )}
              {containers.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs",
                    c.status === "running"
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-black/10 bg-black/5 text-ink-faint",
                  )}
                >
                  <Box size={13} />
                  <span className="font-medium">{c.name}</span>
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", c.status === "running" ? "bg-success" : "bg-ink-faint")}
                  />
                  <span>{c.status}</span>
                  {c.ports.length > 0 && (
                    <span className="font-mono text-[10px] text-ink-muted">
                      {c.ports.map((p) => `${p.host}:${p.container}`).join(", ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

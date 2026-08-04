import { Box, Layers, Network } from "lucide-react";
import type { K8sState } from "../../lib/k8sSim";

export function K8sViz({ state }: { state: K8sState }) {
  const standalonePods = state.pods.filter((p) => p.ownerDeployment === null);

  if (state.deployments.length === 0 && standalonePods.length === 0 && state.services.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-black/15 text-sm text-ink-faint">
        No resources yet — run{" "}
        <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5 font-mono">kubectl run web --image=nginx</code> to get
        started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-base-soft/40 p-3">
      {state.services.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {state.services.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs text-accent"
            >
              <Network size={13} />
              <span className="font-medium">{s.name}</span>
              <span className="text-ink-muted">
                {s.type} :{s.port} &rarr; {s.targetDeployment}
              </span>
            </div>
          ))}
        </div>
      )}

      {state.deployments.map((d) => {
        const pods = state.pods.filter((p) => p.ownerDeployment === d.name);
        return (
          <div key={d.name} className="rounded-xl border border-black/10 bg-base-panel p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <Layers size={16} className="text-accent-soft" />
              {d.name}
              <span className="font-mono text-xs text-ink-muted">
                {pods.length}/{d.replicas} ready &middot; {d.image}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {pods.length === 0 && <span className="text-xs text-ink-faint">No pods running</span>}
              {pods.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs text-success"
                >
                  <Box size={13} />
                  <span className="font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {standalonePods.length > 0 && (
        <div className="rounded-xl border border-black/10 bg-base-panel p-3">
          <div className="text-sm font-medium text-ink">Standalone pods</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {standalonePods.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs text-success"
              >
                <Box size={13} />
                <span className="font-medium">{p.name}</span>
                <span className="font-mono text-[10px] text-ink-muted">{p.image}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

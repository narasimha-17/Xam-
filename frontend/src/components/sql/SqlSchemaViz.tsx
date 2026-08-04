import { Table2 } from "lucide-react";
import { SCHEMA_INFO } from "../../lib/sqlLevels";

export function SqlSchemaViz() {
  return (
    <div className="flex flex-wrap gap-3 rounded-xl border border-black/10 bg-base-soft/40 p-3">
      {SCHEMA_INFO.map((t) => (
        <div key={t.table} className="flex min-w-40 flex-col gap-2 rounded-xl border border-black/10 bg-base-panel p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Table2 size={15} className="text-accent-soft" />
            {t.table}
          </div>
          <ul className="flex flex-col gap-0.5">
            {t.columns.map((c) => (
              <li key={c} className="font-mono text-xs text-ink-muted">
                {c}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

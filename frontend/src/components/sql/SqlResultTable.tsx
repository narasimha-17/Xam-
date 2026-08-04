import type { QueryResult } from "../../lib/sqlEngine";

export function SqlResultTable({ result }: { result: QueryResult | null }) {
  if (!result) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-black/15 text-sm text-ink-faint">
        Run a query to see results here.
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 font-mono text-xs text-danger">
        {result.error}
      </div>
    );
  }

  if (result.columns.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center rounded-xl border border-black/10 bg-base-soft/40 text-sm text-ink-muted">
        Query ran successfully (no rows returned).
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-black/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-base-soft/60">
            {result.columns.map((c, i) => (
              <th key={i} className="border-b border-black/10 px-3 py-2 text-left font-mono text-xs font-semibold text-ink">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.length === 0 ? (
            <tr>
              <td colSpan={result.columns.length} className="px-3 py-4 text-center text-ink-faint">
                (no rows)
              </td>
            </tr>
          ) : (
            result.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 font-mono text-xs text-ink">
                    {cell === null || cell === undefined ? <span className="text-ink-faint">NULL</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

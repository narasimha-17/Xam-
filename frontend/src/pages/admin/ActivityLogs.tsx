import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { fetchActivityLog } from "../../lib/admin";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { SearchInput } from "../../components/ui/SearchInput";

export function ActivityLogs() {
  const [search, setSearch] = useState("");
  const { data: log, isLoading } = useQuery({ queryKey: ["activity-log", "full"], queryFn: () => fetchActivityLog(500) });

  const filtered = log?.filter((entry) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (entry.admin_name ?? "").toLowerCase().includes(q) ||
      entry.action.toLowerCase().includes(q) ||
      entry.target_type.toLowerCase().includes(q) ||
      (entry.detail ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <ScrollText size={24} className="text-accent-soft" /> Logs
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          A record of admin actions across the platform — role changes, deletions, publishes, and more.
        </p>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by admin, action, or target..."
        className="max-w-sm"
      />

      <Card className="flex flex-col gap-1">
        {isLoading && <Loader className="py-16" label="Loading logs..." />}
        {!isLoading && filtered?.length === 0 && (
          <p className="py-16 text-center text-sm text-ink-muted">
            {search ? `No log entries match "${search}".` : "No admin actions logged yet."}
          </p>
        )}
        {!isLoading && filtered && filtered.length > 0 && (
          <div className="flex flex-col divide-y divide-black/5">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink">
                    <span className="font-medium">{entry.admin_name ?? "System"}</span>{" "}
                    <span className="text-ink-muted">{entry.action.replace(/_/g, " ")}</span>{" "}
                    <span className="text-ink-faint">
                      ({entry.target_type}
                      {entry.target_id ? ` #${entry.target_id}` : ""})
                    </span>
                  </p>
                  {entry.detail && <p className="truncate text-xs text-ink-faint">{entry.detail}</p>}
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-ink-faint">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

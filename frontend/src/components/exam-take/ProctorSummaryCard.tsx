import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { fetchProctorEvents, fetchProctorSummary } from "../../lib/proctoring";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Loader } from "../ui/Loader";
import { ProctorSnapshot } from "./ProctorSnapshot";

const LABELS: Record<string, string> = {
  tab_switch: "Tab switch",
  fullscreen_exit: "Fullscreen exit",
  copy_attempt: "Copy attempt",
  paste_attempt: "Paste attempt",
  webcam_snapshot: "Webcam snapshot",
  screenshot_attempt: "Screenshot key pressed",
  no_face_detected: "No face detected",
  multiple_faces: "Multiple faces detected",
};

function ProctorGalleryModal({
  attemptId,
  open,
  onClose,
}: {
  attemptId: number;
  open: boolean;
  onClose: () => void;
}) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["proctor-events", attemptId],
    queryFn: () => fetchProctorEvents(attemptId),
    enabled: open,
  });

  return (
    <Modal open={open} onClose={onClose} title="Proctoring event log" className="max-w-lg">
      {isLoading && <Loader label="Loading events..." />}
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
        {events?.map((e) => (
          <div key={e.id} className="flex flex-col gap-2 rounded-lg border border-black/10 px-3 py-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{LABELS[e.event_type] ?? e.event_type}</span>
              <span className="text-xs text-ink-faint">{new Date(e.occurred_at).toLocaleString()}</span>
            </div>
            {e.has_snapshot && <ProctorSnapshot eventId={e.id} />}
          </div>
        ))}
        {events && events.length === 0 && <p className="text-sm text-ink-muted">No events recorded.</p>}
      </div>
    </Modal>
  );
}

export function ProctorSummaryCard({ attemptId }: { attemptId: number }) {
  const { user } = useAuth();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { data: summary } = useQuery({
    queryKey: ["proctor-summary", attemptId],
    queryFn: () => fetchProctorSummary(attemptId),
  });

  if (!summary || summary.total_events === 0) return null;

  const rows = [
    { label: "Tab switches", count: summary.tab_switch_count },
    { label: "Fullscreen exits", count: summary.fullscreen_exit_count },
    { label: "Copy attempts", count: summary.copy_attempt_count },
    { label: "Paste attempts", count: summary.paste_attempt_count },
    { label: "Webcam snapshots", count: summary.webcam_snapshot_count },
    { label: "Screenshot attempts", count: summary.screenshot_attempt_count },
    { label: "No face detected", count: summary.no_face_detected_count },
    { label: "Multiple faces detected", count: summary.multiple_faces_count },
  ].filter((r) => r.count > 0);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <ShieldAlert size={18} /> Proctoring summary
        </h2>
        {user?.role === "admin" && (
          <Button variant="outline" onClick={() => setGalleryOpen(true)}>
            View details
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {rows.map((r) => (
          <span key={r.label} className="text-ink-muted">
            {r.label}: <span className="font-medium text-ink">{r.count}</span>
          </span>
        ))}
      </div>
      {user?.role === "admin" && (
        <ProctorGalleryModal attemptId={attemptId} open={galleryOpen} onClose={() => setGalleryOpen(false)} />
      )}
    </Card>
  );
}

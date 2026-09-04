import { useEffect, useState } from "react";
import { fetchFeedbackImageUrl } from "../../lib/feedback";

export function FeedbackImage({ feedbackId }: { feedbackId: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchFeedbackImageUrl(feedbackId).then((u) => {
      if (cancelled) {
        URL.revokeObjectURL(u);
        return;
      }
      objectUrl = u;
      setUrl(u);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [feedbackId]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt="Feedback attachment"
      className="mt-1 max-h-64 w-auto max-w-full rounded-xl border border-black/10 object-contain"
    />
  );
}

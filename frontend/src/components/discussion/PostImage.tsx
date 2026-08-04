import { useEffect, useState } from "react";
import { fetchPostImageUrl } from "../../lib/discussions";

export function PostImage({ postId }: { postId: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchPostImageUrl(postId).then((u) => {
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
  }, [postId]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt="Attached"
      className="mt-1 max-h-80 w-auto max-w-full rounded-xl border border-black/10 object-contain"
    />
  );
}

export interface ParsedYoutubeUrl {
  type: "video" | "playlist";
  id: string;
}

export function parseYoutubeUrl(raw: string): ParsedYoutubeUrl | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (!["youtube.com", "youtu.be", "m.youtube.com"].includes(host)) return null;

  const videoId = url.searchParams.get("v");
  if (videoId) return { type: "video", id: videoId };

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (id) return { type: "video", id };
  }

  const listId = url.searchParams.get("list");
  if (listId) return { type: "playlist", id: listId };

  const embedMatch = url.pathname.match(/^\/embed\/([\w-]+)$/);
  if (embedMatch) return { type: "video", id: embedMatch[1] };

  return null;
}

export function youtubeEmbedUrl(parsed: ParsedYoutubeUrl): string {
  return parsed.type === "playlist"
    ? `https://www.youtube.com/embed/videoseries?list=${parsed.id}`
    : `https://www.youtube.com/embed/${parsed.id}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

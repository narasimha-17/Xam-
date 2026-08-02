import { useQuery } from "@tanstack/react-query";
import { fetchProctorSnapshotUrl } from "../../lib/proctoring";
import { Loader } from "../ui/Loader";

export function ProctorSnapshot({ eventId }: { eventId: number }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["proctor-snapshot", eventId],
    queryFn: () => fetchProctorSnapshotUrl(eventId),
    staleTime: Infinity,
  });

  if (isLoading) return <Loader size="sm" />;
  if (!url) return null;

  return <img src={url} alt="Webcam snapshot" className="h-32 w-auto rounded-lg border border-black/10 object-cover" />;
}

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, MessageSquareHeart, Send } from "lucide-react";
import { fetchMyFeedback, submitFeedback } from "../lib/feedback";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { StarRating } from "../components/feedback/StarRating";
import { FeedbackImage } from "../components/feedback/FeedbackImage";

function extractErrorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;
}

export function Feedback() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: myFeedback, isLoading } = useQuery({ queryKey: ["my-feedback"], queryFn: fetchMyFeedback });

  const submitMutation = useMutation({
    mutationFn: () => submitFeedback(description, rating, imageInputRef.current?.files?.[0] ?? null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feedback"] });
      setDescription("");
      setRating(0);
      if (imageInputRef.current) imageInputRef.current.value = "";
      setError(null);
    },
    onError: (err) => setError(extractErrorMessage(err, "Couldn't submit feedback.")),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <MessageSquareHeart size={24} className="text-accent-soft" /> Feedback
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Tell us what's working and what isn't — admins see every submission.</p>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-ink-muted">Your rating</label>
          <StarRating value={rating} onChange={setRating} size={26} />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What would you like to tell us?"
          rows={4}
          className="w-full rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <ImageIcon size={13} /> Screenshot (optional)
          </label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-accent-soft"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          className="w-fit"
          disabled={!description.trim() || rating === 0}
          isLoading={submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          <Send size={15} /> Submit feedback
        </Button>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Your past feedback</h2>
        {isLoading && <Loader label="Loading..." />}
        {myFeedback?.length === 0 && (
          <Card className="text-center text-sm text-ink-muted">You haven't submitted any feedback yet.</Card>
        )}
        {myFeedback?.map((item) => (
          <Card key={item.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <StarRating value={item.rating} size={16} />
              <span className="text-xs text-ink-faint">{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-ink">{item.description}</p>
            {item.image_url && <FeedbackImage feedbackId={item.id} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareHeart, Trash2 } from "lucide-react";
import { deleteFeedback, fetchAdminFeedback } from "../../lib/feedback";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { SearchInput } from "../../components/ui/SearchInput";
import { StarRating } from "../../components/feedback/StarRating";
import { FeedbackImage } from "../../components/feedback/FeedbackImage";

export function FeedbackAdmin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data: feedback, isLoading } = useQuery({ queryKey: ["admin-feedback"], queryFn: fetchAdminFeedback });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeedback(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-feedback"] }),
  });

  const filtered = feedback?.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.user_name.toLowerCase().includes(q) || item.user_email.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
  });

  const avgRating =
    feedback && feedback.length > 0 ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <MessageSquareHeart size={24} className="text-accent-soft" /> Student feedback
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Ratings and comments submitted by students.</p>
        </div>
        {avgRating && (
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2">
            <StarRating value={Math.round(Number(avgRating))} size={16} />
            <span className="text-sm font-medium text-ink">{avgRating} avg &middot; {feedback?.length} total</span>
          </div>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search by student or content..." className="max-w-sm" />

      {isLoading && <Loader className="py-16" label="Loading feedback..." />}
      {!isLoading && filtered?.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">
          {search ? `No feedback matches "${search}".` : "No feedback submitted yet."}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {filtered?.map((item) => (
          <Card key={item.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{item.user_name}</p>
                <p className="text-xs text-ink-faint">
                  {item.user_email} &middot; {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StarRating value={item.rating} size={16} />
                <button
                  onClick={() => confirm("Delete this feedback?") && deleteMutation.mutate(item.id)}
                  className="text-ink-faint hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <p className="text-sm text-ink">{item.description}</p>
            {item.image_url && <FeedbackImage feedbackId={item.id} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

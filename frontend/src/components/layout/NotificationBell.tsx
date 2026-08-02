import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../../lib/notifications";
import type { Notification } from "../../types/api";
import { cn } from "../../lib/utils";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30_000,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const readMutation = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleClickNotification(n: Notification) {
    if (!n.is_read) readMutation.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger" />
        )}
      </button>
      {open && (
        <div className="glass absolute right-0 top-full z-30 mt-1.5 w-80 overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-black/10 px-3 py-2.5">
            <p className="text-sm font-medium text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => readAllMutation.mutate()}
                className="flex items-center gap-1 text-xs text-accent-soft hover:underline"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(!notifications || notifications.length === 0) && (
              <p className="px-3 py-6 text-center text-sm text-ink-faint">No notifications yet.</p>
            )}
            {notifications?.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClickNotification(n)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-black/5 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-black/5",
                  !n.is_read && "bg-accent/5",
                )}
              >
                <span className="flex items-start gap-2 text-ink">
                  {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  <span>{n.message}</span>
                </span>
                <span className="pl-3.5 text-xs text-ink-faint">{timeAgo(n.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

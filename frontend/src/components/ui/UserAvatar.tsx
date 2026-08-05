import { findAvatar } from "../../lib/avatars";
import { cn } from "../../lib/utils";

interface UserAvatarProps {
  fullName?: string | null;
  avatarId?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({ fullName, avatarId, size = 32, className }: UserAvatarProps) {
  const avatar = findAvatar(avatarId);

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white", className)}
      style={{ width: size, height: size, backgroundColor: avatar?.color ?? "var(--color-accent)" }}
    >
      {avatar ? (
        <avatar.icon size={Math.round(size * 0.58)} strokeWidth={2} />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{fullName?.[0]?.toUpperCase() ?? "?"}</span>
      )}
    </div>
  );
}

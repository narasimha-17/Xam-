import { cn } from "../../lib/utils";

export function Logo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 font-display font-semibold", className)}>
      <svg width="28" height="28" viewBox="0 0 64 64" fill="none" className="shrink-0">
        <rect width="64" height="64" rx="16" fill="#0A192F" />
        <rect x="1" y="1" width="62" height="62" rx="15" stroke="#E8A23D" strokeOpacity="0.5" />
        <path d="M14 16L28 32L14 48" stroke="#E8A23D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M40 16L28 32L40 48" stroke="#E8A23D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 24V40" stroke="#E8A23D" strokeWidth="5" strokeLinecap="round" />
        <path d="M42 32H58" stroke="#E8A23D" strokeWidth="5" strokeLinecap="round" />
      </svg>
      {!iconOnly && (
        <span className="text-lg tracking-tight text-ink">
          Xam<span className="text-accent-soft">+</span>
        </span>
      )}
    </div>
  );
}

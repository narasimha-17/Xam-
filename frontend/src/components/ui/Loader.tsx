import { cn } from "../../lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: "h-7 w-7",
  md: "h-11 w-11",
  lg: "h-16 w-16",
};

// Traces the Xam+ mark (the two chevrons, then the plus) in a staggered, looping draw-in —
// the loading state doubles as a brand moment instead of a generic spinner.
export function Loader({ size = "md", label, className }: LoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className={cn("relative", sizeMap[size])}>
        <div className="absolute inset-0 rounded-2xl bg-accent/30 animate-pulse-glow" />
        <svg viewBox="0 0 64 64" fill="none" className="relative h-full w-full">
          <rect width="64" height="64" rx="16" fill="#0A192F" />
          <path
            d="M14 16L28 32L14 48"
            stroke="#E8A23D"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray={100}
            className="animate-logo-draw"
            style={{ animationDelay: "0s" }}
          />
          <path
            d="M40 16L28 32L40 48"
            stroke="#E8A23D"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray={100}
            className="animate-logo-draw"
            style={{ animationDelay: "0.2s" }}
          />
          <path
            d="M50 24V40"
            stroke="#E8A23D"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            className="animate-logo-draw"
            style={{ animationDelay: "0.45s" }}
          />
          <path
            d="M42 32H58"
            stroke="#E8A23D"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            className="animate-logo-draw"
            style={{ animationDelay: "0.45s" }}
          />
        </svg>
      </div>
      {label && <p className="text-sm text-ink-muted font-body animate-fade-in">{label}</p>}
    </div>
  );
}

export function FullPageLoader({ label = "Loading Xam+..." }: { label?: string }) {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader size="lg" label={label} />
    </div>
  );
}

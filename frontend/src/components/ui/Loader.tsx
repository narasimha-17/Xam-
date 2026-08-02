import { cn } from "../../lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6 border-2",
  md: "h-10 w-10 border-[3px]",
  lg: "h-16 w-16 border-4",
};

export function Loader({ size = "md", label, className }: LoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-accent/40 animate-pulse-glow",
            sizeMap[size],
          )}
        />
        <div
          className={cn(
            "relative rounded-full border-black/10 border-t-accent-soft border-r-accent animate-spin-slow",
            sizeMap[size],
          )}
        />
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

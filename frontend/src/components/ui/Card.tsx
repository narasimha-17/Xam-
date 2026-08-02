import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 transition-all duration-300 hover:border-accent/30",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

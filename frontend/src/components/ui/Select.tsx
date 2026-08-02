import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-ink outline-none transition-all duration-200 focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
            className,
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  },
);
Select.displayName = "Select";

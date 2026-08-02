import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-ink placeholder:text-ink-faint outline-none transition-all duration-200 focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
            error && "border-danger/60 focus:border-danger focus:ring-danger/20",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

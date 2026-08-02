import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader } from "./Loader";
import { cn } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  isLoading?: boolean;
}

const variants = {
  primary: "bg-accent text-white shadow-glow hover:bg-accent-dim hover:shadow-glow-lg",
  outline: "border border-black/15 text-ink hover:border-accent/50 hover:bg-black/5",
  ghost: "text-ink-muted hover:text-ink hover:bg-black/5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-body font-medium text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          variants[variant],
          className,
        )}
        {...props}
      >
        {isLoading && <Loader size="sm" className="scale-75" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

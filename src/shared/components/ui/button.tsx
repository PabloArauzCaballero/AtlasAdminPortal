import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  className,
  variant = "secondary",
  isLoading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Shows a spinner and disables the button while an async action is in flight. */
  isLoading?: boolean;
  /** Optional label swapped in while isLoading is true (defaults to keeping current children). */
  loadingText?: string;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "border-atlas-primary bg-atlas-primary text-white shadow-subtle hover:border-[#2A2B30] hover:bg-[#2A2B30] active:scale-[0.98] disabled:border-slate-300 disabled:bg-slate-300",
    secondary:
      "border-atlas-border bg-white text-atlas-text shadow-subtle hover:border-slate-300 hover:bg-atlas-soft active:scale-[0.98] disabled:bg-slate-100",
    ghost:
      "border-transparent bg-transparent text-atlas-text hover:bg-atlas-soft active:scale-[0.98] disabled:text-slate-300",
    danger:
      "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 active:scale-[0.98] disabled:bg-red-50 disabled:text-red-300",
  };
  return (
    <button
      type="button"
      aria-busy={isLoading}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100",
        variants[variant],
        className,
      )}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}

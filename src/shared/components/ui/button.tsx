import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  className,
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "border-transparent bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-sm hover:from-slate-800 hover:to-slate-600 hover:shadow-md active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-300",
    secondary:
      "border-atlas-border bg-white text-atlas-text hover:border-slate-300 hover:bg-atlas-soft active:scale-[0.98] disabled:bg-slate-100",
    ghost:
      "border-transparent bg-transparent text-atlas-text hover:bg-atlas-soft disabled:text-slate-300",
    danger:
      "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 active:scale-[0.98] disabled:bg-red-50 disabled:text-red-300",
  };
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

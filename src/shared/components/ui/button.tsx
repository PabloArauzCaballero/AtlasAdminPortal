import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline"
  | "success"
  | "warning";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-atlas-primary bg-atlas-primary text-white shadow-subtle hover:border-[#2A2B30] hover:bg-[#2A2B30] hover:shadow-card-hover active:scale-[0.97] disabled:border-slate-300 disabled:bg-slate-300",
  secondary:
    "border-atlas-border bg-white text-atlas-text shadow-subtle hover:border-slate-300 hover:bg-atlas-soft hover:shadow-card active:scale-[0.97] disabled:bg-slate-100",
  ghost:
    "border-transparent bg-transparent text-atlas-text hover:bg-atlas-soft active:scale-[0.97] disabled:text-slate-300",
  danger:
    "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 active:scale-[0.97] disabled:bg-red-50 disabled:text-red-300",
  outline:
    "border-atlas-accent/40 bg-transparent text-atlas-accent hover:border-atlas-accent hover:bg-atlas-accentSoft active:scale-[0.97] disabled:border-slate-200 disabled:text-slate-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 active:scale-[0.97] disabled:bg-emerald-50 disabled:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100 active:scale-[0.97] disabled:bg-amber-50 disabled:text-amber-300",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-xs",
  md: "h-9 gap-2 px-3 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
  icon: "h-9 w-9 justify-center p-0",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  isLoading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Tamaño reutilizable. `icon` para botones cuadrados sólo con icono. */
  size?: ButtonSize;
  /** Shows a spinner and disables the button while an async action is in flight. */
  isLoading?: boolean;
  /** Optional label swapped in while isLoading is true (defaults to keeping current children). */
  loadingText?: string;
}) {
  return (
    <button
      type="button"
      aria-busy={isLoading}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100",
        sizes[size],
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

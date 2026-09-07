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
      "border-slate-900 bg-slate-900 text-white shadow-sm hover:-translate-y-px hover:bg-slate-950 hover:shadow-md active:translate-y-0 active:scale-[0.97] disabled:border-slate-300 disabled:bg-slate-300",
    secondary:
      "border-atlas-border bg-white text-atlas-text hover:-translate-y-px hover:border-slate-300 hover:bg-atlas-soft hover:shadow-sm active:translate-y-0 active:scale-[0.97] disabled:bg-slate-100",
    ghost:
      "border-transparent bg-transparent text-atlas-text hover:bg-atlas-soft active:scale-[0.97] disabled:text-slate-300",
    danger:
      "border-red-200 bg-red-50 text-red-700 hover:-translate-y-px hover:border-red-300 hover:bg-red-100 hover:shadow-sm active:translate-y-0 active:scale-[0.97] disabled:bg-red-50 disabled:text-red-300",
  };
  return (
    /*
     * `shrink-0` y `whitespace-nowrap` son correcciones, no estilo.
     *
     * El patrón «campo ancho + botón» —`<div className="flex gap-2"><Input/><Button/></div>`—
     * se repite en media docena de pantallas. El `w-full` del input reclamaba todo el espacio,
     * el botón se comprimía y su etiqueta partía en dos líneas («Abrir / cliente»), lo que a su
     * vez lo hacía más alto que la fila y lo sacaba del borde de la tarjeta. La etiqueta de un
     * botón es siempre corta: no hay caso en que partirla ayude.
     */
    <button
      type="button"
      aria-busy={isLoading}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none disabled:active:scale-100",
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

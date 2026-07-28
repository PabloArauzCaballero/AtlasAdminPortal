import type { InputHTMLAttributes, ReactNode } from "react";
import { AlertCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/**
 * Campo de login con icono, etiqueta, estado de foco/validación y ranura para
 * un control final (p. ej. mostrar/ocultar contraseña). Accesible: label
 * asociado por `htmlFor`, `aria-invalid` y `aria-describedby` del error.
 */
export function LoginField({
  id,
  label,
  icon: Icon,
  error,
  trailing,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  trailing?: ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-atlas-text">
        {label}
      </label>
      <div className="group relative">
        <Icon
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors",
            "group-focus-within:text-atlas-accent",
            error && "text-red-500",
          )}
        />
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-11 w-full rounded-xl border bg-white pl-10 text-sm text-atlas-text shadow-subtle placeholder:text-slate-400",
            "transition-[border-color,box-shadow,background-color] duration-150",
            "focus:outline-none focus:ring-4",
            trailing ? "pr-11" : "pr-3",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
              : "border-slate-300 hover:border-slate-400 focus:border-atlas-accent focus:ring-atlas-accent/10",
            className,
          )}
          {...props}
        />
        {trailing ? (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        ) : null}
      </div>
      {error ? (
        <p
          id={errorId}
          className="flex items-center gap-1 text-xs font-medium text-red-600"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/shared/lib/cn";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-atlas-border bg-white px-3 text-sm text-atlas-text placeholder:text-slate-400 transition-colors focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/15",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-atlas-border bg-white px-3 text-sm text-atlas-text transition-colors focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/15",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-atlas-border bg-white px-3 py-2 text-sm text-atlas-text placeholder:text-slate-400 transition-colors focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/15",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: Readonly<{
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-atlas-text">{label}</span>
      {children}
      {hint ? (
        <span className="block text-xs text-atlas-muted">{hint}</span>
      ) : null}
      {error ? (
        <span className="block text-xs font-medium text-red-600">{error}</span>
      ) : null}
    </label>
  );
}

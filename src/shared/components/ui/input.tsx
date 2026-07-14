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
        "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-atlas-text shadow-sm placeholder:text-slate-400 transition-all hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
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
        "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-atlas-text shadow-sm transition-all hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100",
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
        "min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-atlas-text shadow-sm placeholder:text-slate-400 transition-all hover:border-slate-400 focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:cursor-not-allowed disabled:bg-slate-100",
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
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-atlas-text">{label}</span>
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

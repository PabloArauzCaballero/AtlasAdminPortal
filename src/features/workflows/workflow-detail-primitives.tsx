"use client";

import { cn } from "@/shared/lib/cn";

/** Piezas compartidas por las fichas de etapa, paso y transición. */

export function DetailField({
  label,
  value,
  mono = false,
}: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-atlas-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 break-all text-xs text-atlas-text",
          mono && "font-mono",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function DetailList({
  title,
  items,
  empty,
  mono = false,
}: Readonly<{
  title: string;
  items: readonly string[];
  empty: string;
  mono?: boolean;
}>) {
  return (
    <div>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-atlas-muted">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-0.5 text-xs leading-5 text-atlas-muted">{empty}</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1">
          {items.map((item) => (
            <li
              key={item}
              className={cn(
                "rounded-md border border-atlas-border bg-atlas-soft px-1.5 py-0.5 text-[0.6875rem] text-atlas-text",
                mono && "font-mono",
              )}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DetailSection({
  title,
  isEmpty,
  empty,
  children,
}: Readonly<{
  title: string;
  isEmpty: boolean;
  empty: string;
  children: React.ReactNode;
}>) {
  return (
    <div>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-atlas-muted">
        {title}
      </p>
      {isEmpty ? (
        <p className="mt-0.5 text-xs leading-5 text-atlas-muted">{empty}</p>
      ) : (
        <ul className="mt-1 space-y-1 text-xs text-atlas-muted">{children}</ul>
      )}
    </div>
  );
}

/**
 * Regla de completitud en lenguaje llano. El backend la declara nombrando lo
 * que ya produce `CustomerEligibilityService`; traducirla aquí evita que el
 * portal invente una segunda definición de "etapa completada".
 */
export function describeCompletionRule(rule: Record<string, unknown>): string {
  const type = String(rule.type ?? "");
  if (type === "manual") {
    return "Manual: no hay señal automática, la resuelve una persona.";
  }
  if (type === "no_blockers") {
    const codes = Array.isArray(rule.blockerCodes)
      ? (rule.blockerCodes as string[])
      : [];
    return codes.length > 0
      ? `Se da por completada cuando no queda ninguno de estos bloqueadores: ${codes.join(", ")}.`
      : "Se da por completada cuando no quedan bloqueadores.";
  }
  if (type === "onboarding_section") {
    return `Se completa con la sección «${String(rule.sectionCode ?? "")}» del onboarding.`;
  }
  if (type === "lifecycle_status") {
    const states = Array.isArray(rule.statuses)
      ? (rule.statuses as string[])
      : [];
    return `Se completa cuando el cliente está en: ${states.join(", ")}.`;
  }
  return type ? `Regla declarada: ${type}.` : "Sin regla declarada.";
}

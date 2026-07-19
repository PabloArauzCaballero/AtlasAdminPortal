"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";

/**
 * A short, plain-language note describing what this screen shows and how it is
 * meant to be used. Declarative on purpose ("Esta vista muestra…") so it reads
 * like documentation, not an AI justification.
 */
export function BusinessContextNote({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-amber-200/80 bg-amber-50/50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-amber-50"
      >
        <Lightbulb className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="text-xs font-medium text-amber-900">
          Notas de la vista
        </span>
        <span className="ml-auto text-[0.6875rem] font-medium text-amber-700">
          {open ? "Ocultar" : "Ver"}
        </span>
      </button>
      {open ? (
        <p className="border-t border-amber-200 px-4 py-3 text-sm leading-6 text-amber-900">
          {children}
        </p>
      ) : null}
    </div>
  );
}

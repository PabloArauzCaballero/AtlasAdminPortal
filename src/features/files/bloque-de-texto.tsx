"use client";

import { CopyButton } from "@/shared/components/ui/copy-button";

/** Texto seleccionable y copiable: el JSON de una decisión, un manifiesto o los contactos. */
export function BloqueDeTexto({ texto }: Readonly<{ texto: string }>) {
  return (
    <div className="relative">
      <CopyButton value={texto} className="absolute right-2 top-2" />
      <pre className="max-h-[28rem] select-text overflow-auto rounded bg-slate-50 p-3 pr-10 text-xs text-slate-700">
        {texto}
      </pre>
    </div>
  );
}

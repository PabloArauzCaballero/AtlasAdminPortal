"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { maskByType, type PiiType } from "@/shared/security/pii-formatters";

/**
 * Muestra un dato personal enmascarado. El revelado es opt-in vía `canReveal`
 * (el llamante ya comprobó el permiso) y notifica por `onReveal` para que quede
 * auditado. El valor completo no se persiste: vive solo en el estado del render.
 */
export function MaskedValue({
  value,
  type = "generic",
  canReveal = false,
  onReveal,
}: Readonly<{
  value: string | null | undefined;
  type?: PiiType;
  canReveal?: boolean;
  onReveal?: () => void;
}>) {
  const [revealed, setRevealed] = useState(false);

  if (!value) return <span className="text-atlas-muted">—</span>;

  const shown = revealed ? value : maskByType(value, type);

  function toggle() {
    const next = !revealed;
    setRevealed(next);
    // Solo se audita el acto de revelar, no el de volver a ocultar.
    if (next) onReveal?.();
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span>{shown}</span>
      {canReveal ? (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={revealed}
          aria-label={revealed ? "Ocultar dato" : "Revelar dato"}
          className="rounded p-0.5 text-atlas-muted transition hover:text-atlas-text"
        >
          {revealed ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
      ) : null}
    </span>
  );
}

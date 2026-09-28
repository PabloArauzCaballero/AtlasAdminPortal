"use client";

import type { ComponentProps } from "react";
import { Badge } from "@/shared/components/ui/badges";

type Tono = NonNullable<ComponentProps<typeof Badge>["tone"]>;

const EXITO = new Set(["approved", "APROBADO", "active"]);
const CRITICO = new Set(["rejected", "RECHAZADO", "suspended", "retired"]);
const AVISO = new Set(["under_review", "REVISION_MANUAL", "pending_review"]);

/** El color sale del CÓDIGO; el texto, de la etiqueta en español. */
export function partnerStatusTone(valor: string | null | undefined): Tono {
  if (!valor) return "muted";
  if (EXITO.has(valor)) return "success";
  if (CRITICO.has(valor)) return "critical";
  if (AVISO.has(valor)) return "warning";
  return "default";
}

/**
 * La insignia de estado de esta pantalla. No es `StatusBadge` porque aquél pinta el código tal cual
 * («under_review», «REVISION_MANUAL»), y lo que hay que leer es la palabra.
 */
export function PartnerStatusBadge({
  value,
  label,
}: Readonly<{ value: string | null | undefined; label: string }>) {
  return (
    <Badge tone={partnerStatusTone(value)} dot>
      {label}
    </Badge>
  );
}

"use client";

import { useState } from "react";
import { RoleGate } from "@/shared/auth/role-gate";
import { Button } from "@/shared/components/ui/button";
import { CatalogVersionDecisionDialog } from "./catalog-version-decision-dialog";
import {
  allowedDecisions,
  canSubmitForApproval,
  DECISION_LABELS,
  isTerminalStatus,
} from "./catalog-version-lifecycle";
import type { CatalogDecision } from "./catalog-version-schema";
import { CatalogVersionSubmitDialog } from "./catalog-version-submit-dialog";
import type { CatalogVersionStatus } from "./catalog-version-types";

/**
 * Barra de acciones del ciclo de aprobación: ofrece exactamente lo que el
 * estado admite y nada más (ver `catalog-version-lifecycle`). Si el estado es
 * terminal no se pinta ningún botón — no hay nada que hacer con una versión
 * publicada, retirada o rechazada más que leerla.
 *
 * Las decisiones van dentro de `RoleGate` con `fallback={null}`: el backend las
 * restringe a admin/platform_admin y devuelve 403 al resto, así que a un
 * analista no se le muestra un botón que solo le va a fallar. El gate es
 * cosmético — quien manda es el rol del token en el backend.
 */
export function CatalogVersionActions({
  catalogCode,
  versionId,
  versionCode,
  status,
  itemCount,
}: Readonly<{
  catalogCode: string;
  versionId: string;
  versionCode: string;
  status: CatalogVersionStatus;
  itemCount: number;
}>) {
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<CatalogDecision | null>(null);
  const decisions = allowedDecisions(status);

  if (isTerminalStatus(status)) return null;

  // El backend rechaza con 422 (CATALOG_VERSION_WITHOUT_ITEMS) enviar a
  // aprobación una versión sin items: se avisa antes en vez de dejar intentar.
  const hasItems = itemCount > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canSubmitForApproval(status) ? (
          <>
            <Button
              variant="primary"
              disabled={!hasItems}
              onClick={() => setSubmitting(true)}
            >
              Enviar a aprobación
            </Button>
            {hasItems ? null : (
              <span className="text-xs text-atlas-muted">
                Esta versión no tiene items: el backend no acepta enviarla a
                aprobación.
              </span>
            )}
          </>
        ) : null}

        {decisions.length > 0 ? (
          <RoleGate roles={["SUPER_ADMIN"]} fallback={null}>
            {decisions.map((value) => (
              <Button
                key={value}
                variant={value === "reject" ? "secondary" : "primary"}
                onClick={() => setDecision(value)}
              >
                {DECISION_LABELS[value]}
              </Button>
            ))}
          </RoleGate>
        ) : null}
      </div>

      {submitting ? (
        <CatalogVersionSubmitDialog
          catalogCode={catalogCode}
          versionId={versionId}
          onClose={() => setSubmitting(false)}
        />
      ) : null}

      {decision ? (
        <CatalogVersionDecisionDialog
          catalogCode={catalogCode}
          versionId={versionId}
          versionCode={versionCode}
          decision={decision}
          onClose={() => setDecision(null)}
        />
      ) : null}
    </>
  );
}

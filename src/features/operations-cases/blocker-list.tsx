"use client";

import { Badge } from "@/shared/components/ui/badges";
import type { EligibilityBlocker } from "./customer-actions-types";
import { blockerLabel } from "./eligibility-options";

/** La habilitación resultante de una acción: habilitado, o qué lo sigue bloqueando. */
export function BlockerList({
  eligible,
  blockers,
}: Readonly<{ eligible: boolean; blockers: EligibilityBlocker[] }>) {
  if (eligible || blockers.length === 0) {
    return (
      <p className="text-sm text-emerald-700" data-testid="blockers-none">
        Habilitado para solicitar crédito: no quedan bloqueadores.
      </p>
    );
  }
  return (
    <div data-testid="blockers">
      <p className="text-xs font-medium text-atlas-muted">
        Sigue sin habilitar por:
      </p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {blockers.map((blocker) => (
          <li key={blocker.code}>
            <Badge
              tone={
                blocker.code === "COMPLIANCE_MATCH_PENDING"
                  ? "critical"
                  : "warning"
              }
            >
              {blockerLabel(blocker.code)}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

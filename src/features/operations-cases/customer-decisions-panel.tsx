"use client";

import { BehaviorSummarySection } from "./behavior-summary-section";
import { ComplianceSection } from "./compliance-section";
import { EligibilityDecisionSection } from "./eligibility-decision-section";

/**
 * Los pasos internos de cumplimiento y habilitación del cliente, en su ficha.
 *
 * Las tres rutas existían en el servidor y ninguna pantalla las llamaba (triaje del 2026-09-26,
 * categoría D): el cribado de listas no se ejecutaba nunca y la habilitación sólo cambiaba por la
 * regla automática. El orden es el de la decisión: primero se mira cómo fue el alta, luego se criba
 * y, con eso, se decide.
 */
export function CustomerDecisionsPanel({
  customerId,
  currentStatus,
}: Readonly<{ customerId: string; currentStatus: string | null }>) {
  return (
    <div className="space-y-6">
      <BehaviorSummarySection customerId={customerId} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ComplianceSection customerId={customerId} />
        {/* Si el estado cambia, el formulario recalcula qué transiciones quedan legales. */}
        <EligibilityDecisionSection
          customerId={customerId}
          currentStatus={currentStatus}
        />
      </div>
    </div>
  );
}

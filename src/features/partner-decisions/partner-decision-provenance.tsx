"use client";

import { ExternalLink } from "lucide-react";
import { engineExecutionUrl, engineUrl } from "@/shared/decision-engine/engine-links";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime } from "@/shared/lib/format";
import type { PartnerDecisionProvenance } from "./types";

/**
 * Quién decidió la verificación de este comercio, antes de explicar nada.
 *
 * La pantalla enseñaba «aprobado» sin decir si lo firmó una persona con su criterio o si lo
 * resolvió una política versionada — dos cosas muy distintas para quien audita, y hasta ahora
 * indistinguibles. Ahora la verificación la ejecuta el Motor (`PARTNER_KYB_REVIEW`) y aquí se dice
 * con qué versión, en qué ejecución, y si abrió caso.
 *
 * `null` en todo el bloque significa que el expediente se decidió antes de que esto existiera. Se
 * dice así en vez de rellenarlo: no hay ninguna ejecución detrás de aquellas decisiones, y fingir
 * que la hay es peor que no saberlo.
 */
export function PartnerDecisionProvenanceCard({
  decision,
}: Readonly<{ decision: PartnerDecisionProvenance | null | undefined }>) {
  if (!decision?.outcome) {
    return (
      <p className="rounded-md border border-atlas-border bg-atlas-soft px-3 py-2 text-xs text-atlas-muted">
        Sin veredicto del Motor: este expediente se envió antes de que la
        verificación pasara a decidirse con una política versionada, o el Motor
        no respondió al enviarlo. La decisión manual de abajo es la que hay.
      </p>
    );
  }

  const ejecucion = engineExecutionUrl(decision.executionId);
  const caso = decision.manualReviewCaseCode
    ? engineUrl(`/manual-reviews/${decision.manualReviewCaseCode}`)
    : null;

  return (
    <div className="rounded-md border border-atlas-border bg-white p-3 shadow-subtle">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-atlas-muted">
          Decidió el Motor
        </span>
        <StatusBadge value={decision.outcome} />
        {decision.reason ? (
          <span className="font-mono text-[11px] text-atlas-muted">
            {decision.reason}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-atlas-muted">
        {decision.artifactVersionId
          ? `Versión ${decision.artifactVersionId} del artefacto`
          : "Versión del artefacto no registrada"}
        {decision.evaluatedAt
          ? ` · ${formatDateTime(decision.evaluatedAt)}`
          : ""}
      </p>
      {decision.manualReviewCaseCode ? (
        <p className="mt-2 text-xs text-atlas-text">
          Caso <strong>{decision.manualReviewCaseCode}</strong> abierto en la
          cola del Motor. Se resuelve allí, no aquí: dos bandejas para el mismo
          expediente producen dos veredictos.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3">
        {ejecucion ? (
          <a
            href={ejecucion}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-atlas-accent underline"
          >
            Ver la ejecución <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
        {caso ? (
          <a
            href={caso}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-atlas-accent underline"
          >
            Abrir el caso <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

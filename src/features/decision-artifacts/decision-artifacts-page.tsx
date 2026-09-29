"use client";

import { PageHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { DecisionsTable } from "./decisions-table";
import { catalogErrorText } from "./engine-presence";
import { useDecisionArtifacts } from "./hooks";

/**
 * El catálogo de decisiones delegadas al motor.
 *
 * ## Por qué es una tabla y no tres tarjetas con formulario
 *
 * Porque la primera pregunta de quien abre esta pantalla no es «quiero cambiar algo», es «qué decide
 * este sistema por mí». Una tabla contesta eso de un vistazo —cuántas decisiones hay, qué política
 * resuelve cada una, cuál está configurada y cuál heredada del entorno— y deja el detalle para quien
 * entra a una fila. Tres formularios abiertos a la vez invitan a tocar antes de entender, que es
 * justo el orden equivocado para configurar quién evalúa a los clientes.
 *
 * ## Por qué el detalle es una vista aparte
 *
 * La explicación completa de una decisión —qué hace por dentro, un ejemplo donde se ve la
 * diferencia, qué endpoints la disparan y en qué punto del recorrido ocurre— no cabe en una fila sin
 * volverla ilegible, y comprimirla la convierte en decoración. Cada decisión tiene ademas su propia
 * URL, así que se puede enlazar en un ticket o en un acta de comité.
 */
export function DecisionArtifactsPage() {
  const artifacts = useDecisionArtifacts();
  const data = artifacts.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Motor de decisiones"
        description="Las decisiones que Atlas delega en el motor: qué política resuelve cada una, quién la llama y en qué punto del recorrido ocurre."
      />

      {artifacts.isLoading ? <LoadingSkeleton rows={4} /> : null}

      {artifacts.error ? (
        <ErrorState
          title="No pudimos leer el catálogo"
          description={catalogErrorText(artifacts.error)}
          requestId={
            isAtlasApiError(artifacts.error)
              ? artifacts.error.requestId
              : undefined
          }
          onRetry={() => void artifacts.refetch()}
        />
      ) : null}

      {data ? (
        <div data-testid="decision-catalog">
          <DecisionsTable
            bindings={data.bindings}
            available={data.availableArtifacts}
          />
        </div>
      ) : null}

      <p className="text-xs text-atlas-muted">
        Entra en una decisión para ver qué hace por dentro, qué endpoints la
        disparan y para elegir el artefacto y la versión que la resuelven.
      </p>
    </div>
  );
}

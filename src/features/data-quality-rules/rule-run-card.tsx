"use client";

import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";

/**
 * Antes: «Ejecutar regla», con confirmación y «la acción quedará auditada». Llamaba a
 * `POST /internal/data-quality/rules/:id/run`, que AtlasBackend retiró por devolver 200 sin
 * ejecutar nada; el botón siguió aquí y pasó a dar 404. Tampoco hay evaluación en bloque: el job
 * `recalculate_data_quality` sólo cuenta las incidencias abiertas (`issuesCreated` siempre es 0).
 */
export function RuleRunCard({ ruleId }: Readonly<{ ruleId: string }>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Ejecución"
          description="Las reglas todavía no se evalúan de forma automática."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <p
          className="text-sm text-atlas-muted"
          data-testid="rule-run-note"
          data-rule-id={ruleId}
        >
          Hoy ninguna regla se evalúa sola: la regla queda definida, pero nada
          recorre los datos para levantar incidencias. El proceso «Contar
          incidencias de calidad abiertas» de Procesos automáticos sólo cuenta
          las que ya existen. Esta ficha muestra la definición y el estado de la
          regla; no la dispara.
        </p>
      </CardContent>
    </Card>
  );
}

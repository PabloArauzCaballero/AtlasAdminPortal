"use client";

import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";

/**
 * Antes: «Ejecutar regla», con confirmación y «la acción quedará auditada». Llamaba a
 * `POST /internal/data-quality/rules/:id/run`, que AtlasBackend retiró por devolver 200 sin
 * ejecutar nada; el botón siguió aquí y pasó a dar 404. No hay ejecución por regla: lo que existe
 * es el job de mantenimiento que recalcula todas, y se dispara desde Operaciones.
 */
export function RuleRunCard({ ruleId }: Readonly<{ ruleId: string }>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Ejecución"
          description="Las reglas no se ejecutan de una en una."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <p
          className="text-sm text-atlas-muted"
          data-testid="rule-run-note"
          data-rule-id={ruleId}
        >
          El recálculo de calidad de datos corre para todas las reglas a la vez
          con el job de mantenimiento «Recalcular calidad de datos» de
          Operaciones (primero en simulación, después de verdad). Esta ficha
          muestra la definición y el estado de la regla; no la dispara.
        </p>
      </CardContent>
    </Card>
  );
}

"use client";

import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { isAtlasApiError } from "@/shared/api/errors";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { ConsistencyFindingsTable } from "./consistency-findings-table";
import { useWorkflowConsistency } from "./hooks";
import type { WorkflowConsistencyFinding } from "./types";

/**
 * Deriva entre el flujo declarado y los endpoints montados.
 *
 * Es la comprobación que el backend escribió «para el portal interno y CI» y que el portal no
 * pedía: un paso que apunta a una ruta inexistente, un código incoherente o un estado de ciclo de
 * vida desconocido son errores; roles divergentes o un endpoint aún no descubierto, avisos.
 *
 * Se lanza a mano y no al abrir el lienzo porque recorre el árbol de endpoints entero.
 */
export function WorkflowConsistencyPanel({
  workflowCode,
  version,
}: Readonly<{ workflowCode: string; version?: string }>) {
  const informe = useWorkflowConsistency(workflowCode, version);
  const datos = informe.data;
  const hallazgos = (datos?.findings ?? []) as WorkflowConsistencyFinding[];
  const conDeriva = datos?.status === "drift_detected";

  return (
    <section className="rounded-lg border border-atlas-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-atlas-text">
            Consistencia con los endpoints reales
          </h3>
          <p className="text-xs text-atlas-muted">
            Compara cada paso sembrado con las rutas que este proceso tiene
            montadas.
          </p>
        </div>
        <Button
          disabled={informe.isFetching}
          onClick={() => void informe.refetch()}
        >
          {informe.isFetching ? "Comprobando…" : "Comprobar"}
        </Button>
      </div>

      {informe.isFetching ? <LoadingSkeleton rows={3} /> : null}

      {informe.error ? (
        <p className="mt-3 text-sm text-red-700">
          {isAtlasApiError(informe.error)
            ? informe.error.message
            : "No se pudo comprobar la consistencia del flujo."}
        </p>
      ) : null}

      {datos ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <Badge tone={conDeriva ? "critical" : "success"}>
              {conDeriva ? "Deriva detectada" : "Sin deriva"}
            </Badge>
            <span className="text-xs text-atlas-muted">
              {`${hallazgos.length} hallazgo(s) · ${datos.workflowCode ?? workflowCode} ${datos.version ?? ""}`}
            </span>
          </div>
          <ConsistencyFindingsTable findings={hallazgos} />
        </div>
      ) : null}
    </section>
  );
}

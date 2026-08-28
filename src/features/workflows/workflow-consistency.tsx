"use client";

import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { isAtlasApiError } from "@/shared/api/errors";
import { LoadingSkeleton } from "@/shared/components/ui/states";
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
            Compara cada paso sembrado con las rutas que este proceso tiene montadas.
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
          {hallazgos.length ? (
            <ul className="space-y-2">
              {hallazgos.map((hallazgo, indice) => (
                <li
                  key={`${hallazgo.code ?? "hallazgo"}-${indice}`}
                  className="rounded-md border border-atlas-border p-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        String(hallazgo.severity).toLowerCase() === "error"
                          ? "critical"
                          : "warning"
                      }
                    >
                      {hallazgo.severity ?? "aviso"}
                    </Badge>
                    <span className="font-mono">{hallazgo.code ?? "—"}</span>
                    {hallazgo.stepCode ? (
                      <span className="text-atlas-muted">{`paso ${hallazgo.stepCode}`}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-atlas-muted">{hallazgo.message ?? ""}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-atlas-muted">
              Cada paso del flujo apunta a una ruta que existe y con el rol que declara.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

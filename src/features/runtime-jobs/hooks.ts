"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runRuntimeJob } from "./services";
import type { RuntimeJobBody, RuntimeJobCode } from "./types";

/**
 * Qué queda stale cuando cada job corre **en real**.
 *
 * Solo se aplica con `dryRun: false`: un ensayo no escribe nada, así que
 * invalidar ahí sería refetch gratis. `recalculate-data-quality` invalida dos
 * raíces a propósito — los issues cuelgan de `operations` y las reglas de
 * `internal`, el mismo desacople que documenta RESUELTO_ATLAS_F1_R6.
 */
const AFFECTED_QUERY_ROOTS: Record<RuntimeJobCode, readonly string[][]> = {
  "process-outbox": [["notifications"]],
  "process-events": [["notifications"], ["operations"]],
  "expire-stale-sessions": [["operations"]],
  "apply-retention-policies": [["operations"], ["internal", "exports"]],
  "recalculate-data-quality": [
    ["operations", "data-quality"],
    ["internal", "data-quality"],
  ],
};

export function useRunRuntimeJobMutation(code: RuntimeJobCode) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RuntimeJobBody) => runRuntimeJob(code, body),
    onSuccess: async (_result, body) => {
      // El backend registra una fila de job run incluso en dry-run, así que la
      // bandeja de ejecuciones queda stale en ambos casos.
      await queryClient.invalidateQueries({ queryKey: ["internal", "jobs"] });
      if (body.dryRun) return;

      await Promise.all(
        AFFECTED_QUERY_ROOTS[code].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runRuntimeJob } from "./services";
import type {
  RuntimeJobBody,
  RuntimeJobCode,
  RuntimeJobDefinition,
} from "./types";

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
  "retry-stuck-notifications": [["notifications"]],
  "deliver-pending-notifications": [["notifications"]],
  "reclaim-stuck-events": [["notifications"], ["operations"]],
  "purge-idempotency-keys": [["internal", "jobs"]],
  "purge-processed-outbox": [["internal", "jobs"]],
  // El cierre de flujos abandonados cambia el estado del onboarding de un
  // cliente, que es lo que miran las bandejas de operaciones.
  "mark-abandoned-onboardings": [["operations"], ["customers"]],
};

export function useRunRuntimeJobMutation(definition: RuntimeJobDefinition) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RuntimeJobBody) => runRuntimeJob(definition, body),
    onSuccess: async (_result, body) => {
      // El backend registra una fila de job run incluso en dry-run, así que la
      // bandeja de ejecuciones queda stale en ambos casos.
      await queryClient.invalidateQueries({ queryKey: ["internal", "jobs"] });
      // Un job sin `dryRun` siempre ejecuta de verdad: no hay ensayo que saltar.
      if (body.dryRun) return;

      await Promise.all(
        AFFECTED_QUERY_ROOTS[definition.code].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

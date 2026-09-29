"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime } from "@/shared/lib/format";
import type { FlowImport } from "./types";

type VerifyMutation = UseMutationResult<
  {
    verified: number;
    broken: number;
    unverified: number;
    routesWithRuns: number;
  },
  Error,
  { systemCode: string; windowDays: number }
>;

/** Lo que va a la derecha de la cabecera del mapa de rutas: verificar con corridas y la última carga. */
export function FlowsHeaderActions({
  verify,
  lastImport,
}: Readonly<{ verify: VerifyMutation; lastImport: FlowImport | undefined }>) {
  return (
    <div className="flex max-w-md flex-col items-end gap-1 text-right">
      <PermissionGate permissions={["systems.flows.analyze"]} fallback={null}>
        <Button
          variant="primary"
          disabled={verify.isPending}
          onClick={() =>
            verify.mutate({ systemCode: "ATLAS_BACKEND", windowDays: 30 })
          }
          title="Cruza el catálogo con las corridas reales de system_action_logs (30 días) y recalcula la frescura contra el commit desplegado"
        >
          {verify.isPending ? "Verificando…" : "Verificar con corridas"}
        </Button>
      </PermissionGate>
      {verify.data ? (
        <span className="text-xs text-atlas-muted" data-testid="verify-result">
          {verify.data.verified} verificados · {verify.data.broken} rotos ·{" "}
          {verify.data.unverified} sin corridas · {verify.data.routesWithRuns}{" "}
          rutas con tráfico
        </span>
      ) : null}
      {lastImport ? (
        <span className="text-xs text-atlas-muted">
          Última carga: {lastImport.systemCode} @{" "}
          <span className="font-mono">
            {lastImport.analyzedCommit?.slice(0, 7) ?? "—"}
          </span>{" "}
          · {formatDateTime(lastImport.createdAt)}
        </span>
      ) : null}
    </div>
  );
}

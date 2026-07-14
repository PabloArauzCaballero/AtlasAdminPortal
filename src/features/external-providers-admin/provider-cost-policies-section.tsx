"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber, safeText } from "@/shared/lib/format";
import { useProviderCostPolicies, useUpdateCostPolicyMutation } from "./hooks";
import type { CostPolicy, CostPolicyPatchInput } from "./types";

export function ProviderCostPoliciesSection({
  providerCode,
}: Readonly<{ providerCode: string }>) {
  const policies = useProviderCostPolicies(providerCode);
  const [editing, setEditing] = useState<CostPolicy | null>(null);
  const update = useUpdateCostPolicyMutation(providerCode);

  if (policies.isLoading) return <LoadingSkeleton rows={3} />;
  if (policies.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(policies.error)
            ? policies.error.message
            : "No se pudieron cargar las políticas de costo."
        }
        onRetry={() => void policies.refetch()}
      />
    );
  }

  const items = policies.data ?? [];
  if (items.length === 0) {
    return (
      <p className="text-sm text-atlas-muted">
        Este proveedor no tiene políticas de costo configuradas — QUALITY_AUDIT
        lo marca como hallazgo (MISSING_COST_POLICY).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((policy) => (
        <div
          key={policy.id}
          className="rounded-lg border border-atlas-border p-3 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold">
              {policy.queryType}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge tone={policy.active ? "success" : "muted"}>
                {policy.active ? "Activa" : "Inactiva"}
              </Badge>
              {policy.costTier ? (
                <Badge tone="warning">{policy.costTier}</Badge>
              ) : null}
              {policy.blockByDefault ? (
                <Badge tone="critical">Bloquea por defecto</Badge>
              ) : null}
              {policy.requiresManualApproval ? (
                <Badge tone="info">Requiere aprobación</Badge>
              ) : null}
            </div>
          </div>
          <p className="mt-1 text-xs text-atlas-muted">
            {safeText(policy.unitCostAmount)} {safeText(policy.currency)} ·
            máx/día usuario: {formatNumber(policy.maxQueriesPerUserPerDay)} ·
            máx/día global: {formatNumber(policy.maxQueriesGlobalPerDay)}
          </p>
          <Button
            className="mt-2 h-7 px-2 text-xs"
            onClick={() =>
              setEditing(editing?.id === policy.id ? null : policy)
            }
          >
            {editing?.id === policy.id ? "Cerrar" : "Editar"}
          </Button>
          {editing?.id === policy.id ? (
            <CostPolicyEditForm
              policy={policy}
              onSubmit={(body) =>
                update.mutate(
                  { queryType: policy.queryType, body },
                  { onSuccess: () => setEditing(null) },
                )
              }
              isPending={update.isPending}
              error={update.error}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CostPolicyEditForm({
  policy,
  onSubmit,
  isPending,
  error,
}: Readonly<{
  policy: CostPolicy;
  onSubmit: (body: CostPolicyPatchInput) => void;
  isPending: boolean;
  error: unknown;
}>) {
  const [costTier, setCostTier] = useState(policy.costTier ?? "MEDIUM");
  const [requiresManualApproval, setRequiresManualApproval] = useState(
    policy.requiresManualApproval,
  );
  const [blockByDefault, setBlockByDefault] = useState(policy.blockByDefault);
  const [active, setActive] = useState(policy.active);

  return (
    <div className="mt-3 space-y-3 border-t border-atlas-border pt-3">
      <Field label="Nivel de costo">
        <Select
          value={costTier}
          onChange={(event) =>
            setCostTier(
              event.target.value as NonNullable<CostPolicy["costTier"]>,
            )
          }
        >
          <option value="FREE">FREE</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </Select>
      </Field>
      <div className="flex flex-wrap gap-3 text-xs text-atlas-text">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={requiresManualApproval}
            onChange={(event) =>
              setRequiresManualApproval(event.target.checked)
            }
          />
          Requiere aprobación manual
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={blockByDefault}
            onChange={(event) => setBlockByDefault(event.target.checked)}
          />
          Bloquear por defecto
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Activa
        </label>
      </div>
      {error ? (
        <ErrorState
          title="No se pudo actualizar la política"
          description={
            isAtlasApiError(error) ? error.message : "Error inesperado."
          }
        />
      ) : null}
      <Button
        variant="primary"
        className="h-8 px-3 text-xs"
        isLoading={isPending}
        loadingText="Guardando…"
        onClick={() =>
          onSubmit({ costTier, requiresManualApproval, blockByDefault, active })
        }
      >
        Guardar política
      </Button>
    </div>
  );
}

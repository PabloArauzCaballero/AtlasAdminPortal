"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, Select } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  DESCRIPCION_DE_TRAMO,
  ETIQUETA_DE_TRAMO,
  type TramoDeCosto,
} from "./provider-display";
import type { CostPolicy, CostPolicyPatchInput } from "./types";

const TRAMOS: TramoDeCosto[] = ["FREE", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function CostPolicyEditForm({
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
      <Field
        tooltip="Cuánto cuesta cada consulta a este proveedor, de «sin costo» a «crítico»."
        label="Nivel de costo"
      >
        <Select
          name="costTier"
          value={costTier}
          onChange={(valor) =>
            setCostTier(valor as NonNullable<CostPolicy["costTier"]>)
          }
          options={TRAMOS.map((value) => ({
            value,
            label: ETIQUETA_DE_TRAMO[value],
            description: DESCRIPCION_DE_TRAMO[value],
          }))}
        />
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

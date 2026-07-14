"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useKillSwitchMutation,
  usePatchProviderRuntimeMutation,
} from "./hooks";
import type { ProviderRuntimePatchInput } from "./types";
import type { ProviderRow } from "./provider-columns";

export function ProviderRuntimeForm({
  provider,
}: Readonly<{ provider: ProviderRow }>) {
  const [defaultMode, setDefaultMode] = useState<
    ProviderRuntimePatchInput["defaultMode"] | ""
  >(provider.defaultMode as ProviderRuntimePatchInput["defaultMode"]);
  const [providerStatus, setProviderStatus] = useState<
    ProviderRuntimePatchInput["providerStatus"] | ""
  >(provider.status as ProviderRuntimePatchInput["providerStatus"]);
  const [confirmProductionReady, setConfirmProductionReady] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmingKillSwitch, setConfirmingKillSwitch] = useState(false);

  const patchRuntime = usePatchProviderRuntimeMutation(provider.code);
  const killSwitch = useKillSwitchMutation(provider.code);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Modo">
          <Select
            value={defaultMode}
            onChange={(event) =>
              setDefaultMode(
                event.target.value as ProviderRuntimePatchInput["defaultMode"],
              )
            }
          >
            <option value="mock_local">mock_local</option>
            <option value="mock_server">mock_server</option>
            <option value="sandbox">sandbox</option>
            <option value="production">production</option>
            <option value="disabled">disabled</option>
          </Select>
        </Field>
        <Field label="Estado">
          <Select
            value={providerStatus}
            onChange={(event) =>
              setProviderStatus(
                event.target
                  .value as ProviderRuntimePatchInput["providerStatus"],
              )
            }
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
            <option value="MOCK_ONLY">MOCK_ONLY</option>
            <option value="SANDBOX_ONLY">SANDBOX_ONLY</option>
          </Select>
        </Field>
      </div>
      {defaultMode === "production" ? (
        <label className="flex items-center gap-2 text-sm text-amber-700">
          <input
            type="checkbox"
            checked={confirmProductionReady}
            onChange={(event) =>
              setConfirmProductionReady(event.target.checked)
            }
          />
          Confirmo que este proveedor tiene contrato/credenciales reales listos
          para producción.
        </label>
      ) : null}
      <Field label="Motivo (opcional)">
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      {patchRuntime.error ? (
        <ErrorState
          title="No se pudo actualizar el runtime"
          description={
            isAtlasApiError(patchRuntime.error)
              ? patchRuntime.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(patchRuntime.error)
              ? patchRuntime.error.requestId
              : undefined
          }
        />
      ) : null}
      {patchRuntime.isSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Política runtime actualizada.
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          isLoading={patchRuntime.isPending}
          loadingText="Guardando…"
          onClick={() =>
            patchRuntime.mutate({
              defaultMode: defaultMode || undefined,
              providerStatus: providerStatus || undefined,
              confirmProductionReady,
              reason: reason.trim() || undefined,
            })
          }
        >
          Guardar cambios de runtime
        </Button>
        <Button variant="danger" onClick={() => setConfirmingKillSwitch(true)}>
          Kill switch de emergencia
        </Button>
      </div>
      {killSwitch.error ? (
        <ErrorState
          title="No se pudo activar el kill switch"
          description={
            isAtlasApiError(killSwitch.error)
              ? killSwitch.error.message
              : "Error inesperado."
          }
        />
      ) : null}
      <ConfirmDialog
        open={confirmingKillSwitch}
        title={`Kill switch de ${provider.code}`}
        description="Desactiva inmediatamente el proveedor (modo disabled, estado DISABLED, inactivo). Úsese ante fuga de datos o abuso de costo detectado."
        confirmText="Desactivar ahora"
        isLoading={killSwitch.isPending}
        onCancel={() => setConfirmingKillSwitch(false)}
        onConfirm={() =>
          killSwitch.mutate(reason.trim() || undefined, {
            onSettled: () => setConfirmingKillSwitch(false),
          })
        }
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { OctagonX, Save } from "lucide-react";
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

/**
 * Una frase por opción, porque la diferencia entre los dos modos simulados no se deduce del
 * nombre y es la que decide si el emulador interviene o no.
 */
const AYUDA_MODO: Record<string, string> = {
  mock_local:
    "El backend fabrica la respuesta él mismo. No sale a la red, así que no hay latencia que medir.",
  mock_server:
    "Llama por red al emulador de proveedores. Es el modo que permite medir salud y latencia de verdad.",
  sandbox:
    "Entorno de pruebas del proveedor real. Hoy ningún conector lo implementa: falla explícitamente.",
  production:
    "El proveedor real. Exige credenciales cargadas y la integración implementada.",
  disabled: "No se le llama. Cualquier solicitud a este proveedor se rechaza.",
};

const AYUDA_ESTADO: Record<string, string> = {
  ACTIVE:
    "Es el proveedor oficial para esta categoría. No implica que ya se le llame de verdad: eso lo dice el modo.",
  MOCK_ONLY:
    "Existe para fijar el contrato mientras no haya proveedor firmado.",
  SANDBOX_ONLY: "Sólo autorizado contra el entorno de pruebas del proveedor.",
  DISABLED: "Retirado del catálogo operativo.",
};

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
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/*
         * Las opciones se escribían con el literal del backend (`mock_local`, `MOCK_ONLY`). El
         * mismo concepto se pintaba en castellano en la tabla y en inglés técnico aquí, en el
         * único sitio donde hay que ELEGIR — que es justo donde importa entender la diferencia
         * entre simular en proceso y simular por red.
         */}
        <Field label="Cómo se le llama" hint={AYUDA_MODO[defaultMode ?? ""]}>
          <Select
            value={defaultMode}
            onChange={(event) =>
              setDefaultMode(
                event.target.value as ProviderRuntimePatchInput["defaultMode"],
              )
            }
          >
            <option value="mock_local">Simulado en proceso (sin red)</option>
            <option value="mock_server">Simulado por red (emulador)</option>
            <option value="sandbox">Sandbox del proveedor</option>
            <option value="production">Producción</option>
            <option value="disabled">No llamar</option>
          </Select>
        </Field>
        <Field
          label="Tipo de proveedor"
          hint={AYUDA_ESTADO[providerStatus ?? ""]}
        >
          <Select
            value={providerStatus}
            onChange={(event) =>
              setProviderStatus(
                event.target
                  .value as ProviderRuntimePatchInput["providerStatus"],
              )
            }
          >
            <option value="ACTIVE">Oficial (Atlas lo usará de verdad)</option>
            <option value="MOCK_ONLY">De prueba (relleno contractual)</option>
            <option value="SANDBOX_ONLY">Sólo sandbox</option>
            <option value="DISABLED">Deshabilitado</option>
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
          <Save className="h-4 w-4" aria-hidden />
          Guardar cambios de runtime
        </Button>
        <Button variant="danger" onClick={() => setConfirmingKillSwitch(true)}>
          <OctagonX className="h-4 w-4" aria-hidden />
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

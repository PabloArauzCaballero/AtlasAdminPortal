"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { useRotateCredentialMutation } from "./hooks";
import { FIELDS_BY_METHOD } from "./provider-auth-fields";
import type { CredentialField, ProviderAuthState } from "./types";

export function RotationForm({
  state,
}: Readonly<{ state: ProviderAuthState }>) {
  const fields = FIELDS_BY_METHOD[state.authMethod] ?? [];
  const [field, setField] = useState<CredentialField>(
    fields[0] ?? "CLIENT_SECRET",
  );
  const [material, setMaterial] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const rotate = useRotateCredentialMutation(state.providerCode);

  if (fields.length === 0) {
    return (
      <p className="text-sm text-atlas-muted">
        Este proveedor no requiere credencial, así que no hay nada que rotar.
      </p>
    );
  }

  const canSubmit = material.trim().length >= 8 && reason.trim().length >= 3;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Campo a rotar">
          <Select
            value={field}
            onChange={(event) =>
              setField(event.target.value as CredentialField)
            }
          >
            {fields.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Motivo">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Rotación programada, sospecha de compromiso…"
          />
        </Field>
      </div>
      <Field label="Material nuevo">
        <Input
          type="password"
          autoComplete="off"
          value={material}
          onChange={(event) => setMaterial(event.target.value)}
          placeholder="Se envía al broker, que lo sella. No se guarda en el backend."
        />
      </Field>
      <p className="text-xs text-atlas-muted">
        El material viaja al{" "}
        <span className="font-mono">atlas-auth-broker-worker</span>, que lo
        cifra y descarta el token cacheado del proveedor. El backend no lo
        persiste y la respuesta solo devuelve su huella: no podrá volver a
        consultarse desde aquí.
      </p>
      {rotate.error ? (
        <ErrorState
          title="No se pudo rotar la credencial"
          description={
            isAtlasApiError(rotate.error)
              ? rotate.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(rotate.error) ? rotate.error.requestId : undefined
          }
        />
      ) : null}
      {rotate.isSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Credencial rotada el {formatDateTime(rotate.data.rotatedAt)}. Huella
          activa: <span className="font-mono">{rotate.data.fingerprint}</span>
        </div>
      ) : null}
      <Button
        variant="primary"
        disabled={!canSubmit}
        onClick={() => setConfirming(true)}
      >
        Rotar credencial
      </Button>
      <ConfirmDialog
        open={confirming}
        title={`Rotar ${field} de ${state.providerCode}`}
        description="El proveedor pasará a autenticarse con el material nuevo de inmediato: el token vigente se descarta. Si el material es incorrecto, las llamadas a este proveedor fallarán hasta corregirlo."
        confirmText="Rotar ahora"
        isLoading={rotate.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          rotate.mutate(
            { field, material, reason: reason.trim() },
            {
              onSettled: () => {
                setConfirming(false);
                setMaterial("");
              },
            },
          )
        }
      />
    </div>
  );
}

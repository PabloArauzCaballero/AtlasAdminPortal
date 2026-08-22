"use client";

import { useState } from "react";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import {
  useAuthBrokerAvailability,
  useInvalidateTokenMutation,
  useProviderAuthStates,
  useRevokeCredentialMutation,
} from "./hooks";
import {
  AuthMethodBadge,
  CredentialStatusBadge,
  TokenStatusBadge,
} from "./provider-auth-badges";
import { RotationForm } from "./provider-auth-rotation-form";
import type { ProviderAuthState } from "./types";

/**
 * `KeyValueGrid` normaliza cualquier valor a texto (`safeText`), así que los badges van en una
 * fila propia por encima de la rejilla en vez de dentro de ella: pasarlos como `value` los
 * imprimiría como objeto.
 */
function AuthStateGrid({ state }: Readonly<{ state: ProviderAuthState }>) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <AuthMethodBadge value={state.authMethod} />
        <CredentialStatusBadge value={state.credentialStatus} />
        <TokenStatusBadge value={state.tokenStatus} />
      </div>
      <KeyValueGrid
        items={[
          {
            // La huella permite confirmar QUÉ credencial está cargada —y comparar entornos— sin
            // revelar el secreto. Es el único identificador de la credencial que sale del broker.
            label: "Huella de la credencial",
            value: state.credentialFingerprint ?? "—",
            mono: true,
          },
          { label: "Alcances", value: state.scopes.join(", ") || "—" },
          { label: "Antigüedad (días)", value: state.credentialAgeDays ?? "—" },
          {
            label: "Alta de la credencial",
            value: formatDateTime(state.issuedAt),
          },
          { label: "Última rotación", value: formatDateTime(state.rotatedAt) },
          {
            label: "Rotación exigida el",
            value: formatDateTime(state.rotationDueAt),
            tone:
              state.credentialStatus === "ROTATION_DUE" ? "warning" : "default",
          },
          {
            label: "Token expira",
            value: formatDateTime(state.tokenExpiresAt),
          },
          {
            label: "Última renovación",
            value: formatDateTime(state.lastRefreshAt),
          },
          {
            label: "Último fallo",
            value: state.lastFailureCode ?? "—",
            tone: state.lastFailureCode ? "critical" : "default",
          },
          {
            label: "Fecha del último fallo",
            value: formatDateTime(state.lastFailureAt),
          },
        ]}
      />
    </div>
  );
}

function DangerZone({ state }: Readonly<{ state: ProviderAuthState }>) {
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [reason, setReason] = useState("");
  const revoke = useRevokeCredentialMutation(state.providerCode);
  const invalidate = useInvalidateTokenMutation(state.providerCode);

  return (
    <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/40 p-3">
      <p className="text-sm font-semibold text-red-800">
        Acciones de contención
      </p>
      <Field label="Motivo">
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          isLoading={invalidate.isPending}
          loadingText="Invalidando…"
          onClick={() => invalidate.mutate()}
        >
          Forzar renovación del token
        </Button>
        <Button
          variant="danger"
          disabled={reason.trim().length < 3}
          onClick={() => setConfirmingRevoke(true)}
        >
          Revocar credencial
        </Button>
      </div>
      {invalidate.isSuccess ? (
        <p className="text-sm text-emerald-800">
          Token descartado: la próxima llamada pedirá uno nuevo.
        </p>
      ) : null}
      {revoke.isSuccess ? (
        <p className="text-sm text-red-800">
          Credencial revocada el {formatDateTime(revoke.data.revokedAt)}. El
          broker rechazará toda llamada a este proveedor hasta que se rote.
        </p>
      ) : null}
      {revoke.error ? (
        <ErrorState
          title="No se pudo revocar"
          description={
            isAtlasApiError(revoke.error)
              ? revoke.error.message
              : "Error inesperado."
          }
        />
      ) : null}
      <ConfirmDialog
        open={confirmingRevoke}
        title={`Revocar la credencial de ${state.providerCode}`}
        description="Toda llamada a este proveedor fallará hasta que se rote la credencial. Úsese ante sospecha de compromiso del secreto."
        confirmText="Revocar ahora"
        isLoading={revoke.isPending}
        onCancel={() => setConfirmingRevoke(false)}
        onConfirm={() =>
          revoke.mutate(reason.trim(), {
            onSettled: () => setConfirmingRevoke(false),
          })
        }
      />
    </div>
  );
}

export function ProviderAuthSection({
  providerCode,
}: Readonly<{ providerCode: string }>) {
  const availability = useAuthBrokerAvailability();
  const states = useProviderAuthStates(availability.data?.configured === true);

  if (availability.isLoading) return <LoadingSkeleton rows={4} />;

  // "No configurado" no es un fallo: es un despliegue que todavía no delega la autenticación en
  // el broker. Pintarlo en rojo llevaría a diagnosticar un incidente que no existe.
  if (availability.data && !availability.data.configured) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Este backend todavía no delega la autenticación de proveedores en el{" "}
        <span className="font-mono">atlas-auth-broker-worker</span>. Configure{" "}
        <span className="font-mono">AUTH_BROKER_BASE_URL</span> y{" "}
        <span className="font-mono">AUTH_BROKER_SERVICE_TOKEN</span> para ver
        aquí el estado de las credenciales.
      </div>
    );
  }

  if (availability.data && !availability.data.reachable) {
    return (
      <ErrorState
        title="El broker de autenticación no responde"
        description="El backend está configurado para delegar la autenticación, pero no alcanza al worker. Las llamadas a proveedores que exijan credencial fallarán mientras dure la incidencia."
        onRetry={() => void availability.refetch()}
      />
    );
  }

  if (states.isLoading) return <LoadingSkeleton rows={4} />;

  if (states.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(states.error)
            ? states.error.message
            : "No se pudo cargar el estado de autenticación."
        }
        requestId={
          isAtlasApiError(states.error) ? states.error.requestId : undefined
        }
        onRetry={() => void states.refetch()}
      />
    );
  }

  const state = (states.data ?? []).find(
    (entry) => entry.providerCode === providerCode,
  );

  if (!state) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-atlas-muted">
        El broker no tiene ninguna credencial declarada para{" "}
        <span className="font-mono">{providerCode}</span>.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AuthStateGrid state={state} />
      <div className="border-t border-slate-200 pt-4">
        <p className="mb-3 text-sm font-semibold text-atlas-text">
          Rotar credencial
        </p>
        <RotationForm state={state} />
      </div>
      <DangerZone state={state} />
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useQueueStressRunMutation,
  useStressProfile,
} from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { StressProfileForm } from "./stress-profile-form";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Card, CardContent } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  formatBoolean,
  formatDateTime,
  formatNumber,
} from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function StressProfileDetailPage({
  profileId,
}: Readonly<{ profileId: string }>) {
  const profile = useStressProfile(profileId);
  const queueMutation = useQueueStressRunMutation(profileId);
  const { hasPermission } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [environment, setEnvironment] = useState<
    "LOCAL" | "STAGING" | "PRODUCTION_READONLY"
  >("LOCAL");
  const [approvalTicket, setApprovalTicket] = useState("");
  const canExecute = hasPermission("systems.stress.execute");

  function queueRun() {
    queueMutation.mutate(
      {
        environment,
        dryRun: true,
        approvalTicket: approvalTicket || undefined,
        config: {},
        headers: {},
      },
      { onSuccess: () => setConfirmOpen(false) },
    );
  }

  const productionSelected = environment === "PRODUCTION_READONLY";
  const productionAllowedByProfile =
    profile.data?.environmentScope.includes("PRODUCTION_READONLY") ?? false;
  const queueDisabled =
    !canExecute || !profile.data?.isEnabled || productionSelected;

  return (
    <PermissionGate permissions={["systems.stress.read"]}>
      {profile.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {profile.error ? (
        <ErrorState
          description={
            isAtlasApiError(profile.error)
              ? profile.error.message
              : "No se pudo cargar perfil de stress."
          }
          requestId={
            isAtlasApiError(profile.error) ? profile.error.requestId : undefined
          }
          onRetry={() => void profile.refetch()}
        />
      ) : null}
      {profile.data ? (
        <>
          <PageHeader
            eyebrow={`Stress profile #${profile.data.profileId}`}
            title={profile.data.name}
            description={
              profile.data.notes ?? "Perfil de stress sin notas adicionales."
            }
            actions={
              <>
                <StatusBadge value={profile.data.status} />
                {canExecute ? (
                  <Button onClick={() => setEditing(true)}>
                    Editar perfil
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  disabled={queueDisabled}
                  title={
                    productionSelected
                      ? "El servicio interno bloquea stress en producción."
                      : !canExecute
                        ? "Necesitas systems.stress.execute."
                        : undefined
                  }
                  onClick={() => setConfirmOpen(true)}
                >
                  Encolar dry-run
                </Button>
              </>
            }
          />
          <div className="space-y-6">
            <KeyValueGrid
              items={[
                { label: "Código", value: profile.data.code, mono: true },
                {
                  label: "Endpoint",
                  value: `#${profile.data.endpointId}`,
                  mono: true,
                },
                {
                  label: "Target RPS",
                  value: formatNumber(profile.data.targetRps),
                },
                {
                  label: "Duración",
                  value: `${formatNumber(profile.data.durationSeconds)} s`,
                },
                {
                  label: "Concurrencia",
                  value: formatNumber(profile.data.concurrency),
                },
                { label: "Max error rate", value: profile.data.maxErrorRate },
                { label: "Max p95 ms", value: profile.data.maxP95Ms },
                {
                  label: "Ambientes",
                  value: profile.data.environmentScope.join(", "),
                },
                {
                  label: "Habilitado",
                  value: formatBoolean(profile.data.isEnabled),
                },
                {
                  label: "Requiere aprobación",
                  value: formatBoolean(profile.data.requiresApproval),
                },
                {
                  label: "Creado",
                  value: formatDateTime(profile.data.createdAt),
                },
                {
                  label: "Actualizado",
                  value: formatDateTime(profile.data.updatedAt),
                },
              ]}
            />
            <Card>
              <CardContent className="space-y-4">
                <p className="text-sm text-atlas-muted">
                  El portal encola `dryRun=true`. El servicio interno bloquea
                  `PRODUCTION_READONLY` para stress runs, incluso si aparece en
                  el perfil.
                </p>
                <Link
                  className="text-sm font-medium text-blue-700 hover:underline"
                  href={`/internal/systems/endpoints/${profile.data.endpointId}`}
                >
                  Ver endpoint asociado
                </Link>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Ambiente"
                    hint={
                      productionAllowedByProfile
                        ? "Producción aparece como scope pero está bloqueada para stress."
                        : undefined
                    }
                  >
                    <Select
                      value={environment}
                      onChange={(event) =>
                        setEnvironment(event.target.value as typeof environment)
                      }
                    >
                      <option value="LOCAL">LOCAL</option>
                      <option value="STAGING">STAGING</option>
                      {productionAllowedByProfile ? (
                        <option value="PRODUCTION_READONLY">
                          PRODUCTION_READONLY
                        </option>
                      ) : null}
                    </Select>
                  </Field>
                  <Field
                    label="Ticket de aprobación"
                    hint="Opcional para dry-run; obligatorio si el servicio interno habilita ejecución real controlada."
                  >
                    <Input
                      value={approvalTicket}
                      onChange={(event) =>
                        setApprovalTicket(event.target.value)
                      }
                      placeholder="CHG-123 / ticket interno"
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
            <JsonViewer title="Perfil completo" value={profile.data} />
          </div>
          <DrawerPanel
            open={editing}
            title={`Editar ${profile.data.code}`}
            onClose={() => setEditing(false)}
          >
            <StressProfileForm
              profile={profile.data}
              onSaved={() => setEditing(false)}
            />
          </DrawerPanel>
          <ConfirmDialog
            open={confirmOpen}
            title="Confirmar stress dry-run"
            description={`Se encolará un plan de stress en ${environment}. No se ejecuta carga real desde la interfaz.`}
            confirmText="Encolar"
            isLoading={queueMutation.isPending}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={queueRun}
          />
          {queueMutation.error ? (
            <div className="mt-4">
              <ErrorState
                description={
                  isAtlasApiError(queueMutation.error)
                    ? queueMutation.error.message
                    : "No se pudo encolar stress run."
                }
                requestId={
                  isAtlasApiError(queueMutation.error)
                    ? queueMutation.error.requestId
                    : undefined
                }
              />
            </div>
          ) : null}
          {queueMutation.data ? (
            <div className="mt-4">
              <JsonViewer title="Run encolado" value={queueMutation.data} />
            </div>
          ) : null}
        </>
      ) : null}
    </PermissionGate>
  );
}

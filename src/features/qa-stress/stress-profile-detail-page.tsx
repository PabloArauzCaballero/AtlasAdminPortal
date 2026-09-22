"use client";

import { ENVIRONMENT_OPTIONS } from "@/features/qa-console/qa-options";
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
import {
  DEFAULT_QUEUE_RUN_ADVANCED,
  parseQueueRunAdvanced,
  QueueRunAdvancedFields,
} from "./queue-run-advanced-fields";
import { StressProfileSummary } from "./stress-profile-summary";
import { Card, CardContent } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { Gauge } from "lucide-react";

export function StressProfileDetailPage(
  props: Readonly<{ profileId: string }>,
) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.stress.read"]}>
      <AuthorizedStressProfileDetailPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedStressProfileDetailPage({
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
  const [advanced, setAdvanced] = useState(DEFAULT_QUEUE_RUN_ADVANCED);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const canExecute = hasPermission("systems.stress.execute");

  function patchAdvanced(patch: Partial<typeof advanced>) {
    setAdvanced((current) => ({ ...current, ...patch }));
  }

  function openConfirm() {
    const parsed = parseQueueRunAdvanced(advanced);
    if (!parsed.ok) {
      setAdvancedError(parsed.error);
      return;
    }
    setAdvancedError(null);
    setConfirmOpen(true);
  }

  function queueRun() {
    const parsed = parseQueueRunAdvanced(advanced);
    if (!parsed.ok) {
      setAdvancedError(parsed.error);
      setConfirmOpen(false);
      return;
    }
    queueMutation.mutate(
      {
        environment,
        dryRun: advanced.dryRun,
        baseUrl: advanced.baseUrl.trim() || undefined,
        approvalTicket: approvalTicket || undefined,
        config: {
          payload: parsed.payload,
          timeoutMs: advanced.timeoutMs,
          requestBudget: advanced.requestBudget,
        },
        headers: parsed.headers,
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
    <>
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
            icon={Gauge}
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
                  onClick={openConfirm}
                >
                  {advanced.dryRun ? "Encolar dry-run" : "Encolar stress real"}
                </Button>
              </>
            }
          />
          <div className="space-y-6">
            <StressProfileSummary profile={profile.data} />
            <Card>
              <CardContent className="space-y-4">
                <p className="text-sm text-atlas-muted">
                  El servicio interno bloquea `PRODUCTION_READONLY` para stress
                  runs, incluso si aparece en el perfil. En dry-run sólo se
                  valida que la URL sea construible: no sale tráfico.
                </p>
                <Link
                  className="text-sm font-medium text-atlas-accent underline"
                  href={`/internal/systems/endpoints/${profile.data.endpointId}`}
                >
                  Ver endpoint asociado
                </Link>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <Field
                    label="Ambiente"
                    tooltip="Entorno contra el que se encola la corrida de este perfil."
                    hint={
                      productionAllowedByProfile
                        ? "Producción aparece como scope pero está bloqueada para stress."
                        : undefined
                    }
                  >
                    <Select
                      name="ambiente"
                      options={ENVIRONMENT_OPTIONS.filter(
                        (option) =>
                          productionAllowedByProfile ||
                          option.value !== "PRODUCTION_READONLY",
                      )}
                      value={environment}
                      onChange={(valor) =>
                        setEnvironment(valor as typeof environment)
                      }
                    />
                  </Field>
                  <Field
                    label="Ticket de aprobación"
                    tooltip="Número del cambio aprobado que autoriza la corrida. Ej.: CHG-123"
                    hint="Opcional para dry-run; obligatorio si el perfil exige aprobación y la corrida es real."
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
                <QueueRunAdvancedFields
                  value={advanced}
                  onChange={patchAdvanced}
                  endpointBaseUrl={null}
                />
                {advancedError ? (
                  <ErrorState
                    title="Configuración inválida"
                    description={advancedError}
                  />
                ) : null}
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
            title={
              advanced.dryRun
                ? "Confirmar stress dry-run"
                : "Confirmar stress real"
            }
            description={
              advanced.dryRun
                ? `Se encolará un plan de stress en ${environment}. No se ejecuta carga real desde la interfaz.`
                : `Se encolará un plan de stress REAL en ${environment}: el worker mandará tráfico de verdad contra ${advanced.baseUrl.trim() || "el host del endpoint del perfil"}.`
            }
            confirmText="Encolar"
            isLoading={queueMutation.isPending}
            typedConfirmationPhrase={
              !advanced.dryRun && environment !== "LOCAL"
                ? "EJECUTAR"
                : undefined
            }
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
    </>
  );
}

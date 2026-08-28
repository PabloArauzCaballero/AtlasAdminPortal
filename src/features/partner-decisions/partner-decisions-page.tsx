"use client";

import { useState } from "react";
import { Stamp } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { useDecidePartnerMutation, usePartnerStatus, useSetMdrRateMutation } from "./hooks";

/**
 * Verificación de comercios.
 *
 * Es la pantalla que faltaba para cerrar el onboarding: el expediente llegaba a «en revisión» y no
 * había forma de aprobarlo o rechazarlo desde ninguna consola, así que ningún comercio llegaba a
 * estar verificado. El onboarding es autoservicio hasta el envío; de ahí en adelante es
 * verificación, y por eso el propio backend deja fuera al rol `merchant`: un comercio que pudiera
 * aprobarse a sí mismo convertiría el trámite en un formulario.
 *
 * El identificador se teclea porque el backend no publica un listado de expedientes en revisión.
 * De donde se saca es de «Vistas del negocio › Cola operativa», que sí los lista.
 */
export function PartnerDecisionsPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedPartnerDecisionsPage />
    </RoleGate>
  );
}

function AuthorizedPartnerDecisionsPage() {
  const [entrada, setEntrada] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mdr, setMdr] = useState("");
  const [pendiente, setPendiente] = useState<"aprobar" | "rechazar" | null>(null);

  const estado = usePartnerStatus(partnerId);
  const decidir = useDecidePartnerMutation(partnerId);
  const fijarMdr = useSetMdrRateMutation(partnerId);

  const perfil = (estado.data?.profile ?? estado.data ?? {}) as Record<string, unknown>;
  const onboardingStatus = String(perfil.onboardingStatus ?? "");
  const enRevision = onboardingStatus === "under_review";

  return (
    <>
      <PageHeader
        icon={Stamp}
        eyebrow="Onboarding de comercios"
        title="Verificación de expedientes"
        description="Aprobar o rechazar el expediente de un comercio y fijar su comisión. Sin esta decisión el comercio nunca queda verificado."
      />

      <Card className="mb-6">
        <Field
          label="Identificador del comercio"
          hint="Se toma de «Vistas del negocio › Cola operativa». El backend no publica un listado propio de expedientes en revisión."
        >
          <div className="flex gap-2">
            <Input
              value={entrada}
              onChange={(evento) => setEntrada(evento.target.value)}
              placeholder="partnerId"
            />
            <Button variant="primary" onClick={() => setPartnerId(entrada.trim())}>
              Abrir expediente
            </Button>
          </div>
        </Field>
      </Card>

      {estado.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {estado.error ? (
        <Card>
          <p className="text-sm text-red-700">
            {isAtlasApiError(estado.error)
              ? estado.error.message
              : "No se pudo leer el expediente."}
          </p>
        </Card>
      ) : null}

      {estado.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Estado"
              value={<StatusBadge value={onboardingStatus || "—"} />}
            />
            <MetricCard label="Razón social" value={String(perfil.legalName ?? "—")} />
            <MetricCard label="NIT" value={String(perfil.taxId ?? "—")} />
            <MetricCard
              label="Decidido"
              value={String(perfil.decidedAt ?? "Sin decidir")}
            />
          </section>

          <Card>
            <h2 className="mb-1 text-base font-semibold text-atlas-text">Decisión</h2>
            <p className="mb-4 text-sm text-atlas-muted">
              Sólo se decide desde «en revisión». Volver a decidir sobre un expediente ya resuelto
              responde 409: la decisión es una sola y queda con quién la firmó.
            </p>
            {!enRevision ? (
              <p className="text-sm text-atlas-muted">
                {`Este expediente está en «${onboardingStatus || "sin estado"}», así que no admite decisión.`}
              </p>
            ) : (
              <div className="space-y-3">
                <Field
                  label="Motivo del rechazo"
                  hint="Obligatorio para rechazar; el comercio lo verá y es lo que le dice qué corregir."
                >
                  <Textarea
                    rows={3}
                    value={motivo}
                    onChange={(evento) => setMotivo(evento.target.value)}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={() => setPendiente("aprobar")}>
                    Aprobar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={motivo.trim().length < 3}
                    onClick={() => setPendiente("rechazar")}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 text-base font-semibold text-atlas-text">Comisión (MDR)</h2>
            <p className="mb-4 text-sm text-atlas-muted">
              Porcentaje que Atlas cobra sobre lo que el cliente paga en cada venta financiada. Se
              negocia en el onboarding y se puede ajustar después.
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={mdr}
                onChange={(evento) => setMdr(evento.target.value)}
                placeholder="3.50"
              />
              <Button
                disabled={!mdr || fijarMdr.isPending}
                onClick={() => void fijarMdr.mutateAsync(Number(mdr))}
              >
                Fijar comisión
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-semibold text-atlas-text">
              Expediente completo
            </h2>
            <JsonViewer value={estado.data} />
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendiente !== null}
        title={pendiente === "aprobar" ? "Aprobar el expediente" : "Rechazar el expediente"}
        description={
          pendiente === "aprobar"
            ? "El comercio queda verificado: sus QR resolverán y sus ventas podrán atribuirse. La decisión queda con tu usuario y su fecha."
            : `El comercio queda rechazado con el motivo escrito. Podrá corregir y volver a enviar.`
        }
        confirmText={pendiente === "aprobar" ? "Aprobar" : "Rechazar"}
        isLoading={decidir.isPending}
        onCancel={() => setPendiente(null)}
        onConfirm={() => {
          const aprobado = pendiente === "aprobar";
          void decidir
            .mutateAsync(
              aprobado ? { approved: true } : { approved: false, rejectionReason: motivo.trim() },
            )
            .finally(() => setPendiente(null));
        }}
      />
    </>
  );
}

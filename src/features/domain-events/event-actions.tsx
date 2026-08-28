"use client";

import { useState } from "react";
import { RoleGate } from "@/shared/auth/role-gate";
import { RUNTIME_JOB_ROLE_LIST } from "@/shared/auth/portal-roles";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useCancelEventMutation, useRetryEventMutation } from "./hooks";
import type { DomainEventSummary } from "./types";

type Pendiente = "retry" | "cancel" | null;

/** Un evento ya procesado o cancelado no se reintenta: la acción se esconde donde no aplica. */
const REINTENTABLES = ["FAILED", "PENDING", "DEAD_LETTER", "RETRY"];

export function EventRowActions({
  event,
}: Readonly<{ event: DomainEventSummary }>) {
  const [pendiente, setPendiente] = useState<Pendiente>(null);
  const retry = useRetryEventMutation();
  const cancel = useCancelEventMutation();
  const estado = event.status?.toUpperCase() ?? "";
  const puedeReintentar = REINTENTABLES.includes(estado);
  const puedeCancelar = estado !== "PROCESSED" && estado !== "CANCELLED";

  if (!puedeReintentar && !puedeCancelar) return <span>—</span>;

  return (
    <RoleGate roles={RUNTIME_JOB_ROLE_LIST}>
      <div className="flex flex-wrap gap-2">
        {puedeReintentar ? (
          <Button onClick={() => setPendiente("retry")}>Reintentar</Button>
        ) : null}
        {puedeCancelar ? (
          <Button variant="danger" onClick={() => setPendiente("cancel")}>
            Cancelar
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={pendiente !== null}
        title={pendiente === "retry" ? "Reintentar el evento" : "Cancelar el evento"}
        description={
          pendiente === "retry"
            ? `El evento ${event.eventCode} vuelve a la cola y se procesará de nuevo. Su llave de idempotencia impide que el efecto se duplique si ya se había aplicado.`
            : `El evento ${event.eventCode} deja de intentarse. Lo que dependía de él NO ocurrirá: cancelar es una decisión de negocio, no una limpieza.`
        }
        confirmText={pendiente === "retry" ? "Reintentar" : "Cancelar el evento"}
        isLoading={retry.isPending || cancel.isPending}
        onCancel={() => setPendiente(null)}
        onConfirm={() => {
          const accion = pendiente === "retry" ? retry : cancel;
          void accion.mutateAsync(event.id).finally(() => setPendiente(null));
        }}
      />
    </RoleGate>
  );
}

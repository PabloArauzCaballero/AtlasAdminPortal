"use client";

import { useState } from "react";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, safeText } from "@/shared/lib/format";
import {
  useCancelNotificationMessageMutation,
  useNotificationMessage,
  useRetryNotificationMessageMutation,
} from "./hooks";
import {
  NotificationCategoryBadge,
  NotificationChannelBadge,
  NotificationStatusBadge,
} from "./notification-columns";
import type { NotificationDelivery } from "./types";

export function MessageDetailDrawer({
  messageId,
  onClose,
}: Readonly<{ messageId: string; onClose: () => void }>) {
  const message = useNotificationMessage(messageId);
  const retry = useRetryNotificationMessageMutation();
  const cancel = useCancelNotificationMessageMutation();
  const [confirmAction, setConfirmAction] = useState<"retry" | "cancel" | null>(
    null,
  );
  const data = message.data;

  const canRetry = data?.status === "failed" || data?.status === "cancelled";
  const canCancel = ["pending", "queued", "retrying"].includes(
    data?.status ?? "",
  );

  return (
    <DrawerPanel open title={`Mensaje #${messageId}`} onClose={onClose}>
      {message.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {message.error ? (
        <ErrorState
          description={
            isAtlasApiError(message.error)
              ? message.error.message
              : "No se pudo cargar el mensaje."
          }
          requestId={
            isAtlasApiError(message.error) ? message.error.requestId : undefined
          }
          onRetry={() => void message.refetch()}
        />
      ) : null}
      {data ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <NotificationStatusBadge value={data.status} />
            <NotificationChannelBadge value={data.channel} />
            <NotificationCategoryBadge value={data.category} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-atlas-text">
              {safeText(data.title ?? data.subject ?? "Sin título")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-atlas-text">
              {data.body}
            </p>
          </div>
          <KeyValueGrid
            items={[
              {
                label: "Destinatario",
                value: `${data.recipientType}#${data.recipientId}`,
                mono: true,
              },
              { label: "Plantilla", value: data.templateCode, mono: true },
              { label: "Ícono", value: data.icon, mono: true },
              { label: "Prioridad", value: data.priority },
              { label: "Correlación", value: data.correlationId, mono: true },
              { label: "Causación", value: data.causationId, mono: true },
              {
                label: "Evento origen",
                value: data.outboxEventId,
                mono: true,
              },
              { label: "Programado", value: formatDateTime(data.scheduledAt) },
              { label: "En cola", value: formatDateTime(data.queuedAt) },
              { label: "Enviado", value: formatDateTime(data.sentAt) },
              { label: "Entregado", value: formatDateTime(data.deliveredAt) },
              { label: "Leído", value: formatDateTime(data.readAt) },
              { label: "Fallido", value: formatDateTime(data.failedAt) },
              { label: "Cancelado", value: formatDateTime(data.cancelledAt) },
            ]}
          />
          <PermissionGate
            permissions={["notifications.messages.manage"]}
            fallback={null}
          >
            <div className="flex flex-wrap gap-2">
              {canRetry ? (
                <Button onClick={() => setConfirmAction("retry")}>
                  Reintentar entrega
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  variant="secondary"
                  onClick={() => setConfirmAction("cancel")}
                >
                  Cancelar mensaje
                </Button>
              ) : null}
            </div>
          </PermissionGate>
          {retry.error ? (
            <ErrorState
              description={
                isAtlasApiError(retry.error)
                  ? retry.error.message
                  : "No se pudo reintentar el mensaje."
              }
            />
          ) : null}
          {cancel.error ? (
            <ErrorState
              description={
                isAtlasApiError(cancel.error)
                  ? cancel.error.message
                  : "No se pudo cancelar el mensaje."
              }
            />
          ) : null}
          <DeliveriesSection deliveries={data.deliveries} />
          <JsonViewer title="Payload" value={data.payload} />
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction === "retry" ? "Reintentar entrega" : "Cancelar mensaje"
        }
        description={
          confirmAction === "retry"
            ? "Se encolará un nuevo intento de entrega para este mensaje."
            : "El mensaje quedará cancelado y no se enviará. Esta acción es auditable."
        }
        confirmText={
          confirmAction === "retry" ? "Reintentar" : "Cancelar mensaje"
        }
        isLoading={retry.isPending || cancel.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const mutation = confirmAction === "retry" ? retry : cancel;
          void mutation
            .mutateAsync(messageId)
            .finally(() => setConfirmAction(null));
        }}
      />
    </DrawerPanel>
  );
}

function DeliveriesSection({
  deliveries,
}: Readonly<{ deliveries: NotificationDelivery[] }>) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-atlas-muted">
        Historial de entrega ({deliveries.length})
      </h4>
      {deliveries.length === 0 ? (
        <p className="text-sm text-atlas-muted">
          Sin intentos de entrega registrados todavía.
        </p>
      ) : (
        <ul className="space-y-2">
          {deliveries.map((delivery) => (
            <li
              key={delivery.id}
              className="rounded-lg border border-atlas-border p-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-atlas-text">
                  Intento #{delivery.attemptNumber} · {delivery.provider}
                </span>
                <NotificationStatusBadge value={delivery.status} />
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-atlas-muted">
                <div>
                  Enviado:{" "}
                  {delivery.sentAt ? formatDateTime(delivery.sentAt) : "—"}
                </div>
                <div>
                  Entregado:{" "}
                  {delivery.deliveredAt
                    ? formatDateTime(delivery.deliveredAt)
                    : "—"}
                </div>
                {delivery.errorCode ? (
                  <div className="col-span-2 text-red-600">
                    {delivery.errorCode}: {safeText(delivery.errorMessage)}
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

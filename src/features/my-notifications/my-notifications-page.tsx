"use client";

import { FieldTooltip } from "@/shared/components/ui/field-tooltip";
import type { Option } from "@/shared/lib/options";
import {
  CHANNEL_OPTIONS,
  MESSAGE_STATUS_OPTIONS,
} from "@/features/notifications/notification-options";
import { useState } from "react";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useMarkAllMyNotificationsReadMutation,
  useMarkMyNotificationReadMutation,
  useMyNotifications,
  useMyUnreadNotificationsCount,
} from "./hooks";
import { buildMyNotificationColumns } from "./my-notifications-columns";
import { BellRing } from "lucide-react";

const MIS_ESTADOS = new Set([
  "pending",
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
]);

const statusOptions: Option[] = [
  {
    value: "",
    label: "Todos los estados",
    description: "Tus avisos en cualquier punto del envío.",
  },
  ...MESSAGE_STATUS_OPTIONS.filter((option) => MIS_ESTADOS.has(option.value)),
];

const channelOptions: Option[] = [
  {
    value: "",
    label: "Todos los canales",
    description: "Tus avisos por cualquier vía de entrega.",
  },
  ...CHANNEL_OPTIONS.filter((option) => option.value !== "phone"),
];

export function MyNotificationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");

  const notifications = useMyNotifications({
    page,
    limit: 20,
    status,
    channel,
  });
  const unreadCount = useMyUnreadNotificationsCount();
  const markRead = useMarkMyNotificationReadMutation();
  const markAllRead = useMarkAllMyNotificationsReadMutation();

  const columns = buildMyNotificationColumns(
    (notificationId) => markRead.mutate(notificationId),
    markRead.isPending,
  );

  return (
    <>
      <PageHeader
        icon={BellRing}
        eyebrow="Autoservicio"
        title="Mis notificaciones"
        description="Notificaciones dirigidas a vos: alertas automáticas del backend (ej. un servicio crítico caído o recuperado) y notificaciones personalizadas que un admin te haya enviado."
      />
      <BusinessContextNote>
        A diferencia de &quot;Mensajería interna&quot; (que muestra TODOS los
        mensajes del tenant y requiere permiso de administración), esta vista
        solo trae las notificaciones dirigidas a tu propio usuario interno — no
        a otros.
      </BusinessContextNote>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <Select
              name="estado"
              ariaLabel="Estado"
              compact
              className="w-44"
              options={statusOptions}
              value={status}
              onChange={(valor) => {
                setStatus(valor);
                setPage(1);
              }}
            />
            <FieldTooltip
              label="Estado"
              text="En qué punto del envío está cada aviso tuyo; «failed» no te llegó."
            />
          </span>
          <span className="flex items-center gap-1">
            <Select
              name="canal"
              ariaLabel="Canal"
              compact
              className="w-44"
              options={channelOptions}
              value={channel}
              onChange={(valor) => {
                setChannel(valor);
                setPage(1);
              }}
            />
            <FieldTooltip
              label="Canal"
              text="Por qué vía te llegó cada aviso: app, push, correo, SMS o WhatsApp."
            />
          </span>
          {unreadCount.data ? (
            <span className="rounded-full bg-atlas-accentSoft px-3 py-1 text-xs font-semibold text-atlas-accent">
              {unreadCount.data.unread} sin leer
            </span>
          ) : null}
        </div>
        <Button
          onClick={() => markAllRead.mutate()}
          isLoading={markAllRead.isPending}
          loadingText="Marcando…"
          disabled={!unreadCount.data?.unread}
        >
          Marcar todas como leídas
        </Button>
      </div>
      {markRead.error ? (
        <ErrorState
          title="No se pudo marcar la notificación como leída"
          description={
            isAtlasApiError(markRead.error)
              ? markRead.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(markRead.error)
              ? markRead.error.requestId
              : undefined
          }
        />
      ) : null}
      {markAllRead.error ? (
        <ErrorState
          title="No se pudieron marcar las notificaciones como leídas"
          description={
            isAtlasApiError(markAllRead.error)
              ? markAllRead.error.message
              : "Error inesperado."
          }
        />
      ) : null}
      {notifications.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {notifications.error ? (
        <ErrorState
          description={
            isAtlasApiError(notifications.error)
              ? notifications.error.message
              : "No se pudieron cargar tus notificaciones."
          }
          requestId={
            isAtlasApiError(notifications.error)
              ? notifications.error.requestId
              : undefined
          }
          onRetry={() => void notifications.refetch()}
        />
      ) : null}
      {notifications.data ? (
        <DataTable
          data={notifications.data.items}
          columns={columns}
          meta={notifications.data.meta}
          onPageChange={setPage}
          emptyTitle="No tenés notificaciones."
          emptyDescription="Acá aparecerán las alertas automáticas del backend y las notificaciones que un admin te envíe."
        />
      ) : null}
    </>
  );
}

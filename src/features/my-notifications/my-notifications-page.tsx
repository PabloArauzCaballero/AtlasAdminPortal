"use client";

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

const statusOptions = [
  "pending",
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
].map((value) => ({ label: value, value }));

const channelOptions = ["in_app", "push", "email", "sms", "whatsapp"].map(
  (value) => ({ label: value, value }),
);

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
          <Select
            className="w-44"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            className="w-44"
            value={channel}
            onChange={(event) => {
              setChannel(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los canales</option>
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
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

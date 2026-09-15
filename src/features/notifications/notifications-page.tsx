"use client";

import {
  CHANNEL_OPTIONS,
  MESSAGE_STATUS_OPTIONS,
  RECIPIENT_TYPE_OPTIONS,
} from "./notification-options";
import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useNotificationMessages } from "./hooks";
import { buildNotificationMessageColumns } from "./notification-columns";
import { BroadcastSection } from "./broadcast-section";
import { MessageDetailDrawer } from "./message-detail-drawer";
import { PreferencesSection } from "./preferences-section";
import { TemplatesSection } from "./templates-section";
import type { NotificationMessage } from "./types";
import { MessageSquare } from "lucide-react";

const tabs = ["Mensajes", "Plantillas", "Preferencias", "Enviar notificación"];

export function NotificationsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["notifications.messages.read"]}>
      <AuthorizedNotificationsPage />
    </PermissionGate>
  );
}

function AuthorizedNotificationsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);

  const messages = useNotificationMessages({
    page,
    limit: 20,
    status,
    channel,
    recipientType,
    correlationId,
  });

  const columns = useMemo(
    () =>
      buildNotificationMessageColumns((message: NotificationMessage) =>
        setOpenMessageId(message.id),
      ),
    [],
  );

  return (
    <>
      <PageHeader
        icon={MessageSquare}
        eyebrow="Mensajería interna"
        title="Notificaciones"
        description="Mensajes enviados a clientes, operaciones y usuarios internos a través de in-app, push, email, SMS y WhatsApp, con su historial de entrega."
      />
      <BusinessContextNote>
        Esta vista muestra los mensajes que el sistema genera automáticamente a
        partir de eventos de negocio (una alerta de proveedor, una revisión
        manual abierta, un onboarding completado, etc.) y a quién se les envió.
        No es un chat: los mensajes los dispara el backend según reglas de
        negocio, no se redactan desde aquí. Sirve para auditar qué se comunicó,
        confirmar que llegó, y reintentar o cancelar entregas.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Mensajes" ? (
        <div className="space-y-4">
          <FilterBar
            search={correlationId}
            searchPlaceholder="Buscar por correlation ID…"
            searchTooltip="Pega el correlation ID de una petición para ver todos los mensajes que generó."
            filters={[
              {
                name: "status",
                label: "Estado",
                tooltip:
                  "En qué punto del envío está cada mensaje; «failed» es lo que hay que revisar.",
                value: status,
                options: MESSAGE_STATUS_OPTIONS,
              },
              {
                name: "channel",
                label: "Canal",
                tooltip:
                  "Por qué vía salió el mensaje: app, push, correo, SMS, WhatsApp o llamada.",
                value: channel,
                options: CHANNEL_OPTIONS,
              },
              {
                name: "recipientType",
                label: "Destinatario",
                tooltip:
                  "A qué clase de destinatario iba: cliente, comercio, equipo interno o sistema.",
                value: recipientType,
                options: RECIPIENT_TYPE_OPTIONS,
              },
            ]}
            onSearchChange={(value) => {
              setCorrelationId(value);
              setPage(1);
            }}
            onFilterChange={(name, value) => {
              if (name === "status") setStatus(value);
              if (name === "channel") setChannel(value);
              if (name === "recipientType") setRecipientType(value);
              setPage(1);
            }}
            onClear={() => {
              setStatus("");
              setChannel("");
              setRecipientType("");
              setCorrelationId("");
              setPage(1);
            }}
          />
          {messages.isLoading ? <LoadingSkeleton rows={8} /> : null}
          {messages.error ? (
            <ErrorState
              description={
                isAtlasApiError(messages.error)
                  ? messages.error.message
                  : "No se pudieron cargar los mensajes."
              }
              requestId={
                isAtlasApiError(messages.error)
                  ? messages.error.requestId
                  : undefined
              }
              onRetry={() => void messages.refetch()}
            />
          ) : null}
          {messages.data ? (
            <DataTable
              data={messages.data.items}
              columns={columns}
              meta={messages.data.meta}
              onPageChange={setPage}
              emptyTitle="Sin mensajes para los filtros aplicados."
              emptyDescription="Ajusta los filtros o revisa que existan eventos que disparen notificaciones en esta ventana."
            />
          ) : null}
        </div>
      ) : null}
      {activeTab === "Plantillas" ? <TemplatesSection /> : null}
      {activeTab === "Preferencias" ? <PreferencesSection /> : null}
      {activeTab === "Enviar notificación" ? <BroadcastSection /> : null}
      {openMessageId ? (
        <MessageDetailDrawer
          messageId={openMessageId}
          onClose={() => setOpenMessageId(null)}
        />
      ) : null}
    </>
  );
}

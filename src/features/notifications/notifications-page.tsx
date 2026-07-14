"use client";

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

const tabs = ["Mensajes", "Plantillas", "Preferencias", "Enviar notificación"];

const statusOptions = [
  "pending",
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
  "retrying",
  "cancelled",
].map((value) => ({ label: value, value }));

const channelOptions = [
  "in_app",
  "push",
  "email",
  "sms",
  "whatsapp",
  "phone",
].map((value) => ({ label: value, value }));

const recipientTypeOptions = [
  "customer",
  "merchant",
  "internal_user",
  "operations",
  "system",
].map((value) => ({ label: value, value }));

export function NotificationsPage() {
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
    <PermissionGate permissions={["notifications.messages.read"]}>
      <PageHeader
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
            filters={[
              {
                name: "status",
                label: "Estado",
                value: status,
                options: statusOptions,
              },
              {
                name: "channel",
                label: "Canal",
                value: channel,
                options: channelOptions,
              },
              {
                name: "recipientType",
                label: "Destinatario",
                value: recipientType,
                options: recipientTypeOptions,
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
    </PermissionGate>
  );
}

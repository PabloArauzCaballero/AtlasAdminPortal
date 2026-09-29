"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { BroadcastSection } from "./broadcast-section";
import { MessageDetailDrawer } from "./message-detail-drawer";
import { MessagesSection } from "./messages-section";
import { PreferencesSection } from "./preferences-section";
import { TemplatesSection } from "./templates-section";
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
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);

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
        No es un chat: estos mensajes los dispara Atlas según reglas de negocio;
        lo único que se redacta desde aquí es el aviso de la pestaña «Enviar
        notificación». Sirve para auditar qué se comunicó, confirmar que llegó,
        y reintentar o cancelar entregas.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Mensajes" ? (
        <MessagesSection onOpen={setOpenMessageId} />
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

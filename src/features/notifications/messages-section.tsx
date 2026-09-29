"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { finDelDia, inicioDelDia } from "./date-range";
import { useNotificationMessages } from "./hooks";
import { buildNotificationMessageColumns } from "./notification-columns";
import {
  CHANNEL_OPTIONS,
  MESSAGE_STATUS_OPTIONS,
  RECIPIENT_TYPE_OPTIONS,
} from "./notification-options";
import type { NotificationMessage } from "./types";

/**
 * La pestaña «Mensajes»: todo lo que Atlas mandó, con su estado de entrega.
 *
 * El buscador ya no exige el correlation ID EXACTO: viaja como `q` y el servidor lo busca, por
 * partes, en el correlation ID, el código de plantilla, el título y el asunto. El destinatario y
 * el rango de fechas, que el servidor admitía desde siempre, ahora también se pueden pedir.
 */
export function MessagesSection({
  onOpen,
}: Readonly<{ onOpen: (messageId: string) => void }>) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const messages = useNotificationMessages({
    page,
    limit: 20,
    q: q.trim(),
    status,
    channel,
    recipientType,
    recipientId: recipientId.trim(),
    from: inicioDelDia(desde),
    to: finDelDia(hasta),
  });

  const columns = useMemo(
    () =>
      buildNotificationMessageColumns((message: NotificationMessage) =>
        onOpen(message.id),
      ),
    [onOpen],
  );

  const cambiar = (aplicar: () => void) => {
    aplicar();
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por correlation ID, plantilla o título…"
        searchTooltip="Busca en el servidor, en todos los mensajes: coincide con parte del correlation ID de la petición que los generó, del código de plantilla, del título o del asunto."
        filters={[
          {
            name: "status",
            label: "Estado",
            tooltip:
              "En qué punto del envío está cada mensaje; los fallidos son los que hay que revisar.",
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
        onSearchChange={(value) => cambiar(() => setQ(value))}
        onFilterChange={(name, value) =>
          cambiar(() => {
            if (name === "status") setStatus(value);
            if (name === "channel") setChannel(value);
            if (name === "recipientType") setRecipientType(value);
          })
        }
        onClear={() =>
          cambiar(() => {
            setQ("");
            setStatus("");
            setChannel("");
            setRecipientType("");
            setRecipientId("");
            setDesde("");
            setHasta("");
          })
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="ID del destinatario"
          tooltip="El número del cliente, comercio o usuario interno que recibió el mensaje; se compara exacto."
        >
          <Input
            value={recipientId}
            inputMode="numeric"
            placeholder="Ej: 1024"
            onChange={(event) =>
              cambiar(() => setRecipientId(event.target.value))
            }
          />
        </Field>
        <Field
          label="Desde"
          tooltip="Primer día de la ventana, contado desde las 00:00 de tu hora local."
        >
          <Input
            type="date"
            value={desde}
            onChange={(event) => cambiar(() => setDesde(event.target.value))}
          />
        </Field>
        <Field
          label="Hasta"
          tooltip="Último día de la ventana, incluido entero hasta las 23:59 de tu hora local."
        >
          <Input
            type="date"
            value={hasta}
            onChange={(event) => cambiar(() => setHasta(event.target.value))}
          />
        </Field>
      </div>
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
  );
}

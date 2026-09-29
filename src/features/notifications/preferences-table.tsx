"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Badge } from "@/shared/components/ui/badges";
import { CHANNEL_OPTIONS } from "./notification-options";
import { NotificationChannelBadge } from "./notification-columns";
import type { NotificationPreference } from "./types";

const ESTADO_OPTIONS = [
  { value: "on", label: "Activas", description: "El cliente recibe el aviso." },
  { value: "off", label: "Inactivas", description: "El cliente lo apagó." },
];

function buildColumns(
  onToggle: (item: NotificationPreference) => void,
  pending: boolean,
): ColumnDef<NotificationPreference>[] {
  return [
    {
      header: "Evento",
      accessorKey: "eventCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.eventCode}</span>
      ),
    },
    {
      header: "Canal",
      accessorKey: "channel",
      cell: ({ row }) => (
        <NotificationChannelBadge value={row.original.channel} />
      ),
    },
    {
      header: "Obligatorio",
      accessorKey: "isRequired",
      cell: ({ row }) =>
        row.original.isRequired ? (
          <Badge tone="warning">Obligatorio</Badge>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      id: "estado",
      header: "Estado",
      accessorKey: "isEnabled",
      cell: ({ row }) => {
        const item = row.original;
        const badge = (
          <Badge tone={item.isEnabled ? "success" : "muted"}>
            {item.isEnabled ? "Activo" : "Inactivo"}
          </Badge>
        );
        return (
          <PermissionGate
            permissions={["notifications.messages.manage"]}
            fallback={badge}
          >
            <button
              type="button"
              disabled={item.isRequired || pending}
              title={
                item.isRequired
                  ? "Este evento es obligatorio y no se puede desactivar."
                  : undefined
              }
              onClick={() => onToggle(item)}
              className="rounded-full px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {badge}
            </button>
          </PermissionGate>
        );
      },
    },
  ];
}

/**
 * Las preferencias de UN cliente: el conjunto cerrado de eventos por canal, que el servidor
 * devuelve entero. Se busca y se filtra en el cliente sobre la lista completa.
 */
export function PreferencesTable({
  items,
  customerId,
  pending,
  onToggle,
}: Readonly<{
  items: NotificationPreference[];
  customerId: string;
  pending: boolean;
  onToggle: (item: NotificationPreference) => void;
}>) {
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [estado, setEstado] = useState("");
  const columns = useMemo(
    () => buildColumns(onToggle, pending),
    [onToggle, pending],
  );
  const needle = q.trim().toLowerCase();
  const visibles = items.filter((item) => {
    if (channel && item.channel !== channel) return false;
    if (estado === "on" && !item.isEnabled) return false;
    if (estado === "off" && item.isEnabled) return false;
    return !needle || item.eventCode.toLowerCase().includes(needle);
  });

  return (
    <div className="space-y-4">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código de evento…"
        searchTooltip="Recorre todas las preferencias del cliente, que llegan enteras del servidor: coincide con parte del código del evento."
        filters={[
          {
            name: "channel",
            label: "Canal",
            tooltip: "Por qué vía recibe el cliente ese evento.",
            value: channel,
            options: CHANNEL_OPTIONS,
          },
          {
            name: "estado",
            label: "Estado",
            tooltip: "Si el cliente tiene el aviso encendido o apagado.",
            value: estado,
            options: ESTADO_OPTIONS,
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(name, value) => {
          if (name === "channel") setChannel(value);
          if (name === "estado") setEstado(value);
        }}
        onClear={() => {
          setQ("");
          setChannel("");
          setEstado("");
        }}
      />
      <DataTable
        data={visibles}
        columns={columns}
        emptyTitle={
          items.length === 0
            ? `El cliente #${customerId} no tiene preferencias registradas todavía.`
            : "Ninguna preferencia coincide con la búsqueda."
        }
        emptyDescription={
          items.length === 0
            ? "Se crean al agregar una preferencia más abajo."
            : "Prueba con otro texto o quita los filtros."
        }
      />
    </div>
  );
}

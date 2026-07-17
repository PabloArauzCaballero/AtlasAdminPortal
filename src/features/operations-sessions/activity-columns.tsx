"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BooleanBadge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import type {
  SessionAuditEntry,
  SessionCustomerAction,
  SessionCustomerObservation,
  SessionGpsObservation,
} from "./types";

export function buildGpsObservationColumns(): ColumnDef<SessionGpsObservation>[] {
  return [
    {
      header: "Capturado",
      accessorKey: "capturedAt",
      cell: ({ row }) => formatDateTime(row.original.capturedAt),
    },
    {
      // El backend no expone gpsLat/gpsLng: solo se puede afirmar si la
      // observación traía coordenadas, nunca dónde estaba el cliente.
      header: "Coordenadas",
      accessorKey: "hasCoordinates",
      cell: ({ row }) => (
        <BooleanBadge
          value={row.original.hasCoordinates}
          trueLabel="Registradas"
          falseLabel="Sin registrar"
          tone="info"
        />
      ),
    },
    {
      header: "Precisión (m)",
      accessorKey: "accuracyMeters",
      cell: ({ row }) => formatNumber(row.original.accuracyMeters),
    },
  ];
}

export function buildCustomerActionColumns(): ColumnDef<SessionCustomerAction>[] {
  return [
    {
      header: "Ocurrió",
      accessorKey: "occurredAt",
      cell: ({ row }) => formatDateTime(row.original.occurredAt),
    },
    {
      header: "Evento",
      accessorKey: "eventName",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.eventName)}
        </span>
      ),
    },
    {
      header: "Pantalla",
      accessorKey: "screenName",
      cell: ({ row }) => safeText(row.original.screenName),
    },
  ];
}

export function buildCustomerObservationColumns(): ColumnDef<SessionCustomerObservation>[] {
  return [
    {
      header: "Capturado",
      accessorKey: "capturedAt",
      cell: ({ row }) => formatDateTime(row.original.capturedAt),
    },
    {
      header: "Código",
      accessorKey: "observationCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.observationCode)}
        </span>
      ),
    },
    {
      // Solo se muestra valueBoolean: el endpoint no devuelve valueText/valueNumber/valueJson.
      header: "Valor booleano",
      accessorKey: "valueBoolean",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.valueBoolean} tone="info" />
      ),
    },
  ];
}

export function buildAuditTrailColumns(): ColumnDef<SessionAuditEntry>[] {
  return [
    {
      header: "Ocurrió",
      accessorKey: "occurredAt",
      cell: ({ row }) => formatDateTime(row.original.occurredAt),
    },
    {
      header: "Acción",
      accessorKey: "actionCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.actionCode)}
        </span>
      ),
    },
    {
      header: "Tipo de actor",
      accessorKey: "actorType",
      cell: ({ row }) => safeText(row.original.actorType),
    },
  ];
}

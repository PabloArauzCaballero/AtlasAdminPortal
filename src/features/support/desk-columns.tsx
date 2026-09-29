"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime } from "@/shared/lib/format";
import type { Option } from "@/shared/lib/options";
import type { Tono } from "./labels";
import type { SupportChannel } from "./types";

/** Los tipos de canal que admite el servidor (`ck_support_channel_type`), en palabras. */
export const TIPO_CANAL_OPTIONS: Option[] = [
  {
    value: "CHAT",
    label: "Chat",
    description: "Conversación en vivo desde la app o el portal de comercio.",
  },
  {
    value: "ASYNC_MESSAGING",
    label: "Mensajería diferida",
    description: "Mensajes que se contestan cuando hay quien los atienda.",
  },
  {
    value: "INTERNAL_BRIDGE",
    label: "Puente interno",
    description: "Conversación abierta entre personas del equipo.",
  },
];

/** Los estados en que una conversación es «mía»: la lleva un agente y sigue viva. */
export const ESTADO_MIA_OPTIONS: Option[] = [
  {
    value: "OPEN",
    label: "Abierta",
    description: "En curso: se está hablando con la persona.",
  },
  {
    value: "WAITING_AGENT",
    label: "Esperando tu respuesta",
    description: "La persona escribió y falta que contestes.",
  },
  {
    value: "WAITING_USER",
    label: "Esperando a la persona",
    description: "Ya contestaste; falta la respuesta de la otra parte.",
  },
  {
    value: "CLOSING",
    label: "Cerrándose",
    description: "Se está cerrando: ya no admite mensajes nuevos.",
  },
];

const ESTADO_CANAL: Record<string, { label: string; tone: Tono }> = {
  REQUESTED: { label: "Solicitada", tone: "warning" },
  QUEUED: { label: "En cola", tone: "warning" },
  OPEN: { label: "Abierta", tone: "success" },
  WAITING_AGENT: { label: "Esperando tu respuesta", tone: "warning" },
  WAITING_USER: { label: "Esperando a la persona", tone: "info" },
  CLOSING: { label: "Cerrándose", tone: "muted" },
  CLOSED: { label: "Cerrada", tone: "muted" },
  ABANDONED: { label: "Abandonada", tone: "muted" },
};

const tipoCanal = (codigo: string) =>
  TIPO_CANAL_OPTIONS.find((opcion) => opcion.value === codigo)?.label ?? codigo;

/*
 * Un canal sin expediente es el fallo que la fase B2 cerró en el backend: el chat existía y el caso
 * no, así que la conversación no se podía medir ni enrutar. Los que quedan son anteriores a ese
 * arreglo.
 */
function ExpedienteCelda({ canal }: Readonly<{ canal: SupportChannel }>) {
  if (!canal.caseId)
    return (
      <span className="text-xs text-amber-700">
        Sin expediente (canal anterior al arreglo)
      </span>
    );
  return (
    <Link
      href={`/internal/support/cases/${canal.caseId}`}
      className="font-mono text-xs text-atlas-text underline"
    >
      #{canal.caseId}
    </Link>
  );
}

const conversacion: ColumnDef<SupportChannel> = {
  header: "Conversación",
  id: "conversacion",
  cell: ({ row }) => (
    <div className="min-w-0">
      <p className="truncate font-mono text-xs text-atlas-text">
        {row.original.channelCode ?? `#${row.original.channelId}`}
      </p>
      <p className="font-mono text-xs text-atlas-muted">
        #{row.original.channelId}
      </p>
    </div>
  ),
};

const tipo: ColumnDef<SupportChannel> = {
  header: "Tipo",
  accessorKey: "channelType",
  cell: ({ row }) => tipoCanal(row.original.channelType),
};

const expediente: ColumnDef<SupportChannel> = {
  header: "Expediente",
  id: "expediente",
  cell: ({ row }) => <ExpedienteCelda canal={row.original} />,
};

/** La cola de espera: cada fila es una conversación que todavía no tiene quien la lleve. */
export function buildQueueColumns(accion: {
  onAtender: (channelId: string, caseId: string | null) => void;
  tomando: string | null;
}): ColumnDef<SupportChannel>[] {
  return [
    conversacion,
    tipo,
    expediente,
    {
      header: "Esperando desde",
      accessorKey: "requestedAt",
      cell: ({ row }) => formatDateTime(row.original.requestedAt),
    },
    {
      header: "",
      id: "accion",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <Button
          className="h-8 px-2 text-xs"
          isLoading={accion.tomando === row.original.channelId}
          onClick={() =>
            accion.onAtender(row.original.channelId, row.original.caseId)
          }
        >
          Atender
        </Button>
      ),
    },
  ];
}

/** Mis conversaciones vivas: con el enlace a la ficha donde se contesta. */
export function buildMineColumns(): ColumnDef<SupportChannel>[] {
  return [
    conversacion,
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => {
        const estado = ESTADO_CANAL[row.original.status] ?? {
          label: row.original.status,
          tone: "muted" as Tono,
        };
        return (
          <Badge tone={estado.tone} dot>
            {estado.label}
          </Badge>
        );
      },
    },
    tipo,
    expediente,
    {
      header: "Abierta",
      accessorKey: "openedAt",
      cell: ({ row }) =>
        formatDateTime(row.original.openedAt ?? row.original.requestedAt),
    },
    {
      header: "",
      id: "accion",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) =>
        row.original.caseId ? (
          <Link
            href={`/internal/support/cases/${row.original.caseId}`}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-900 bg-slate-900 px-2 text-xs font-medium text-white hover:bg-slate-950"
          >
            Abrir y responder
          </Link>
        ) : null,
    },
  ];
}

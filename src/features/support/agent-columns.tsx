"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import type { Option } from "@/shared/lib/options";
import { legible } from "./labels";
import { NIVEL_OPTIONS, PRESENCIA_OPTIONS } from "./support-options";
import type { SupportAgentProfile } from "./types";

/** El nombre de un código de nivel o presencia; si el mapa no lo tiene, en texto corrido. */
export function etiqueta(opciones: Option[], codigo: string): string {
  return (
    opciones.find((opcion) => opcion.value === codigo)?.label ?? legible(codigo)
  );
}

export const ESTADO_AGENTE_OPTIONS: Option[] = [
  {
    value: "activo",
    label: "Activos",
    description: "Perfiles vivos: pueden recibir casos y conversaciones.",
  },
  {
    value: "baja",
    label: "Dados de baja",
    description: "Perfiles apagados; su historia sigue a su nombre.",
  },
];

function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Filtra la plantilla COMPLETA de la mesa. `GET /internal/support/desk/agents` devuelve a todos
 * los agentes, sin página ni tope (es un equipo, no un historial), así que filtrar aquí recorre a
 * todos y no a «los de la página».
 */
export function filtrarAgentes(
  agentes: readonly SupportAgentProfile[],
  filtros: { q: string; estado: string; nivel: string },
): SupportAgentProfile[] {
  const buscado = normalizar(filtros.q.trim());
  return agentes.filter(
    (agente) =>
      (!filtros.estado ||
        (filtros.estado === "activo") === agente.isActive) &&
      (!filtros.nivel || agente.supportLevel === filtros.nivel) &&
      (!buscado ||
        normalizar(agente.fullName).includes(buscado) ||
        normalizar(agente.email).includes(buscado)),
  );
}

export function buildAgentColumns(accion: {
  onQuitar: (agentProfileId: string) => void;
  quitando: string | null;
  ocupado: boolean;
}): ColumnDef<SupportAgentProfile>[] {
  return [
    {
      header: "Persona",
      accessorKey: "fullName",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-atlas-text">
            {row.original.fullName ??
              `Usuario interno #${row.original.internalUserId}`}
          </p>
          <p className="truncate text-xs text-atlas-muted">
            {row.original.email ?? "Sin correo registrado"}
          </p>
        </div>
      ),
    },
    {
      header: "Estado",
      accessorKey: "isActive",
      cell: ({ row }) => (
        <Badge tone={row.original.isActive ? "success" : "muted"}>
          {row.original.isActive ? "Activo" : "Dado de baja"}
        </Badge>
      ),
    },
    {
      header: "Nivel",
      accessorKey: "supportLevel",
      cell: ({ row }) => etiqueta(NIVEL_OPTIONS, row.original.supportLevel),
    },
    {
      header: "Presencia",
      accessorKey: "presenceState",
      cell: ({ row }) =>
        etiqueta(PRESENCIA_OPTIONS, row.original.presenceState),
    },
    {
      header: "Ocupación",
      accessorKey: "activeChannelCount",
      cell: ({ row }) =>
        `${row.original.activeChannelCount} de ${row.original.maxConcurrentChannels} chats`,
    },
    {
      header: "",
      id: "accion",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Button
            className="h-8 px-2 text-xs"
            isLoading={accion.ocupado && accion.quitando === row.original.agentProfileId}
            disabled={accion.ocupado}
            onClick={() => accion.onQuitar(row.original.agentProfileId)}
          >
            Quitar de la mesa
          </Button>
        ) : null,
    },
  ];
}

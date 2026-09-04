"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FolderTree } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Badge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTimeBO } from "@/shared/i18n/bolivia-format";
import { useExpedientes } from "./hooks";
import { formatearTamano } from "./node-columns";
import type { Expediente, EstadoExpediente } from "./types";

const TONO_DE_ESTADO: Record<
  EstadoExpediente,
  "info" | "success" | "muted" | "critical"
> = {
  abierto: "info",
  enviado: "success",
  cerrado: "muted",
  purgado: "critical",
};

const ESTADOS = [
  { label: "Abierto", value: "abierto" },
  { label: "Enviado", value: "enviado" },
  { label: "Cerrado", value: "cerrado" },
  { label: "Purgado", value: "purgado" },
];

export function ExploradorDeExpedientesPage() {
  // El gate envuelve a un componente aparte para que las consultas no salgan antes de que decida:
  // pedir la lista de expedientes de todos los clientes y descartarla después no es inofensivo.
  return (
    <PermissionGate permissions={["expedientes.leer"]}>
      <ExploradorAutorizado />
    </PermissionGate>
  );
}

function ExploradorAutorizado() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const expedientes = useExpedientes({ page, pageSize: 25, q, estado });

  const columns = useMemo<ColumnDef<Expediente>[]>(
    () => [
      {
        header: "Expediente",
        accessorKey: "customerCode",
        cell: ({ row }) => (
          <Link
            href={`/internal/files/${row.original.expedienteId}`}
            className="font-medium text-atlas-accent underline"
          >
            {row.original.customerCode ?? `Cliente ${row.original.subjectId}`}
          </Link>
        ),
      },
      {
        header: "Estado",
        accessorKey: "estado",
        cell: ({ row }) => (
          <Badge tone={TONO_DE_ESTADO[row.original.estado]}>
            {row.original.estado}
          </Badge>
        ),
      },
      {
        /*
         * El manifiesto se muestra como columna, no escondido en el detalle.
         *
         * Es la diferencia entre «esto es lo que había cuando el cliente envió su solicitud,
         * firmado» y «esto es lo que hay hoy». Un expediente rellenado a posteriori no lo tiene
         * —no se puede fabricar una foto de un momento que nadie observó— y quien decide sobre el
         * caso necesita saberlo antes de abrirlo.
         */
        header: "Manifiesto",
        accessorKey: "manifestPresente",
        cell: ({ row }) =>
          row.original.manifestPresente ? (
            <Badge tone="success">Firmado al enviarse</Badge>
          ) : (
            <Badge tone="muted">Sin manifiesto</Badge>
          ),
      },
      {
        header: "Archivos",
        accessorKey: "nodosTotal",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.nodosTotal ?? "—"}</span>
        ),
      },
      {
        header: "Tamaño",
        accessorKey: "bytesTotal",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatearTamano(row.original.bytesTotal)}
          </span>
        ),
      },
      {
        header: "Enviado",
        accessorKey: "enviadoEn",
        cell: ({ row }) =>
          row.original.enviadoEn
            ? formatDateTimeBO(row.original.enviadoEn)
            : "—",
      },
      {
        header: "Abierto",
        accessorKey: "creadoEn",
        cell: ({ row }) => formatDateTimeBO(row.original.creadoEn),
      },
    ],
    [],
  );

  if (expedientes.isLoading) return <LoadingSkeleton />;
  if (expedientes.error)
    return (
      <ErrorState
        title="No se pudo traer la lista de expedientes."
        onRetry={() => void expedientes.refetch()}
      />
    );

  return (
    <>
      <PageHeader
        icon={FolderTree}
        eyebrow="Operaciones"
        title="Archivos"
        description="Un expediente por cliente, con todo lo que se subió, se generó o se revisó sobre él."
      />
      <BusinessContextNote>
        Cada fila es la carpeta de una persona: su carnet, su selfie, sus
        extractos y lo que el Motor dejó al evaluarla. El acceso NO es el mismo
        para todos —se hereda por carpeta y se puede ampliar caso por caso— y
        cada apertura de un archivo queda registrada con quién lo abrió. Es el
        mismo material que se ve al revisar un caso en revisión humana; aquí se
        ve completo y ordenado.
      </BusinessContextNote>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código de cliente…"
        onSearchChange={(valor) => {
          setQ(valor);
          setPage(1);
        }}
        onFilterChange={(nombre, valor) => {
          if (nombre === "estado") setEstado(valor);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setEstado("");
          setPage(1);
        }}
        filters={[
          { name: "estado", label: "Estado", value: estado, options: ESTADOS },
        ]}
      />
      <DataTable
        data={expedientes.data?.items ?? []}
        columns={columns}
        meta={expedientes.data?.meta}
        onPageChange={setPage}
        emptyTitle="Ningún expediente coincide."
        emptyDescription="Los expedientes se abren solos al empezar un onboarding. Los clientes anteriores necesitan el relleno histórico."
      />
    </>
  );
}

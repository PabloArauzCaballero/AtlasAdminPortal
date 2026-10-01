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
import { usePageSize } from "@/shared/lib/page-size";

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
  {
    label: "Abierto",
    value: "abierto",
    description:
      "Todavía recibe archivos: el alta o el trámite siguen en curso.",
  },
  {
    label: "Enviado",
    value: "enviado",
    description: "Se envió la solicitud y quedó firmado lo que había entonces.",
  },
  {
    label: "Cerrado",
    value: "cerrado",
    description: "Ya no admite archivos nuevos; se conserva para consulta.",
  },
  {
    label: "Purgado",
    value: "purgado",
    description: "Venció su retención y se borraron los archivos del almacén.",
  },
];

/*
 * Cliente y comercio conviven en la misma lista: el expediente de un negocio (sus QR de cobro, el
 * poder de su representante, lo que el ERP guarda de su cuenta) se abre por el mismo módulo que el
 * de una persona. La etiqueta existe porque «Andina» al lado de «CLI-900» no dice cuál es cuál, y
 * quien busca el QR de un comercio no debería abrir la carpeta de un cliente por descarte.
 */
const TIPOS_DE_SUJETO = [
  {
    label: "Cliente",
    value: "customer",
    description:
      "La carpeta de una persona: carnet, selfie, extractos y evaluación.",
  },
  {
    label: "Comercio",
    value: "partner",
    description:
      "La carpeta de un negocio: QR de cobro, poderes y documentos del ERP.",
  },
];

const ETIQUETA_DE_SUJETO: Record<string, string> = {
  customer: "Cliente",
  partner: "Comercio",
  claim: "Reclamo",
};

function EtiquetaDeSujeto({ subjectType }: Readonly<{ subjectType: string }>) {
  return (
    <Badge tone={subjectType === "partner" ? "info" : "muted"}>
      {ETIQUETA_DE_SUJETO[subjectType] ?? subjectType}
    </Badge>
  );
}

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
  const [subjectType, setSubjectType] = useState("");
  const expedientes = useExpedientes({
    page,
    pageSize: usePageSize(25),
    q,
    estado,
    subjectType,
  });

  const columns = useMemo<ColumnDef<Expediente>[]>(
    () => [
      {
        header: "Expediente",
        enableSorting: false,
        accessorKey: "customerCode",
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <Link
              href={`/internal/files/${row.original.expedienteId}`}
              className="font-medium text-atlas-accent underline"
            >
              {row.original.customerCode ??
                `${ETIQUETA_DE_SUJETO[row.original.subjectType] ?? "Expediente"} ${row.original.subjectId}`}
            </Link>
            <EtiquetaDeSujeto subjectType={row.original.subjectType} />
          </span>
        ),
      },
      {
        header: "Estado",
        enableSorting: false,
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
        enableSorting: false,
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
        enableSorting: false,
        accessorKey: "nodosTotal",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.nodosTotal ?? "—"}</span>
        ),
      },
      {
        header: "Tamaño",
        enableSorting: false,
        accessorKey: "bytesTotal",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatearTamano(row.original.bytesTotal)}
          </span>
        ),
      },
      {
        header: "Enviado",
        enableSorting: false,
        accessorKey: "enviadoEn",
        cell: ({ row }) =>
          row.original.enviadoEn
            ? formatDateTimeBO(row.original.enviadoEn)
            : "—",
      },
      {
        header: "Abierto",
        enableSorting: false,
        accessorKey: "creadoEn",
        cell: ({ row }) => formatDateTimeBO(row.original.creadoEn),
      },
    ],
    [],
  );

  /*
   * Carga y error se pintan DONDE va la tabla, no en lugar de la página: con un `return` temprano
   * cada tecla del buscador desmontaba la barra entera —se perdía el foco y lo escrito— mientras
   * llegaba la respuesta.
   */
  return (
    <>
      <PageHeader
        icon={FolderTree}
        eyebrow="Operaciones"
        title="Archivos"
        description="Un expediente por cliente y por comercio, con todo lo que se subió, se generó o se revisó sobre él."
      />
      <BusinessContextNote>
        Cada fila es la carpeta de una persona —su carnet, su selfie, sus
        extractos y lo que el Motor dejó al evaluarla— o de un comercio: sus QR
        de cobro, el poder de su representante y los documentos de su cuenta en
        el ERP. El acceso NO es el mismo para todos —se hereda por carpeta y se
        puede ampliar caso por caso— y cada apertura de un archivo queda
        registrada con quién lo abrió. Es el mismo material que se ve al revisar
        un caso en revisión humana; aquí se ve completo y ordenado.
      </BusinessContextNote>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código de cliente, nombre o NIT del comercio…"
        searchTooltip="Busca en el servidor, en todos los expedientes: coincide con parte del código del cliente, de la razón social o el nombre comercial del comercio, o de su NIT. Si escribes sólo números, también encuentra el expediente cuyo sujeto tiene exactamente ese número."
        onSearchChange={(valor) => {
          setQ(valor);
          setPage(1);
        }}
        onFilterChange={(nombre, valor) => {
          if (nombre === "estado") setEstado(valor);
          if (nombre === "subjectType") setSubjectType(valor);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setEstado("");
          setSubjectType("");
          setPage(1);
        }}
        filters={[
          {
            name: "subjectType",
            label: "Tipo",
            value: subjectType,
            options: TIPOS_DE_SUJETO,
            tooltip:
              "Deja sólo las carpetas de personas o sólo las de comercios.",
          },
          {
            name: "estado",
            label: "Estado",
            value: estado,
            options: ESTADOS,
            tooltip:
              "En qué punto de su vida está la carpeta: abierta, enviada, cerrada o purgada.",
          },
        ]}
      />
      {expedientes.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {expedientes.error ? (
        <ErrorState
          title="No se pudo traer la lista de expedientes."
          onRetry={() => void expedientes.refetch()}
        />
      ) : null}
      {expedientes.data ? (
        <DataTable
          data={expedientes.data.items}
          columns={columns}
          meta={expedientes.data.meta}
          onPageChange={setPage}
          emptyTitle="Ningún expediente coincide."
          emptyDescription="Los expedientes se abren solos al empezar un onboarding de cliente o al crearse un comercio. Los clientes anteriores necesitan el relleno histórico."
        />
      ) : null}
    </>
  );
}

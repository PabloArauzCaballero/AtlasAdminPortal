"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import type { ConsentDocument } from "./types";

/** El estado en palabras: «published» o «retired» es el código de la base, no lo que se lee. */
export function statusLabel(status: string | null): string {
  if (status === "published") return "Vigente";
  if (status === "retired") return "Retirado";
  if (status === "draft") return "Borrador";
  return "Sin estado";
}

/**
 * El estado se pinta con el tono del sistema, no con un color inventado por la pantalla.
 *
 * `published` es lo que el cliente está aceptando ahora mismo y por eso va en verde; `retired`
 * describe algo que ya no se ofrece y se apaga en gris; cualquier otro estado —un borrador— avisa
 * en ámbar de que hay texto escrito que todavía no rige.
 */
function statusTone(status: string | null): "success" | "muted" | "warning" {
  if (status === "published") return "success";
  if (status === "retired") return "muted";
  return "warning";
}

/**
 * Columnas de la tabla de documentos. La tabla pagina en el servidor, así que ninguna columna se
 * ofrece ordenable: reordenar sólo la página cargada prometería un orden global.
 */
export function buildConsentDocumentColumns(
  canEdit: boolean,
  onEdit: (document: ConsentDocument) => void,
): ColumnDef<ConsentDocument>[] {
  return [
    {
      header: "Documento",
      enableSorting: false,
      accessorKey: "title",
      cell: ({ row }) => (
        <div
          className="max-w-xs"
          data-testid={`consent-document-${row.original.documentCode}`}
        >
          <p className="text-sm font-semibold text-atlas-text">
            {row.original.title ?? row.original.documentCode}
          </p>
          <p className="font-mono text-xs text-atlas-muted">
            {row.original.documentCode}
          </p>
        </div>
      ),
    },
    {
      header: "Versión",
      enableSorting: false,
      accessorKey: "versionCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.versionCode}</span>
      ),
    },
    {
      header: "Idioma",
      enableSorting: false,
      accessorKey: "language",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.language}</span>
      ),
    },
    {
      header: "Estado",
      enableSorting: false,
      accessorKey: "status",
      cell: ({ row }) => (
        <Badge tone={statusTone(row.original.status)}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      header: "Vigencia",
      enableSorting: false,
      accessorKey: "effectiveFrom",
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-mono text-xs">
          {row.original.effectiveFrom ?? "—"}
          {row.original.effectiveUntil
            ? ` → ${row.original.effectiveUntil}`
            : ""}
        </span>
      ),
    },
    {
      header: "Resumen",
      enableSorting: false,
      accessorKey: "summary",
      cell: ({ row }) =>
        row.original.summary ? (
          <span className="block max-w-xs text-xs text-atlas-text">
            {row.original.summary}
          </span>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Texto",
      enableSorting: false,
      accessorKey: "bodyMarkdown",
      // El cuerpo se muestra recortado: quien administra necesita reconocer el documento de un
      // vistazo; leerlo entero es lo que hace el modo edición, donde además se puede corregir.
      cell: ({ row }) => (
        <span className="line-clamp-2 block max-w-sm whitespace-pre-wrap font-mono text-xs leading-5 text-atlas-muted">
          {row.original.bodyMarkdown ?? "(sin texto)"}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true },
      cell: ({ row }) =>
        canEdit ? (
          <Button
            variant="secondary"
            className="h-8 px-2 text-xs"
            onClick={() => onEdit(row.original)}
            data-testid={`edit-${row.original.documentCode}`}
          >
            Editar texto
          </Button>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
  ];
}

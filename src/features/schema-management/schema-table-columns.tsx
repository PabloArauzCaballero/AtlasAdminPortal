"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  Boxes,
  ChevronRight,
  Columns3,
  Gauge,
  Link2,
  Lock,
  ScrollText,
  Table2,
  Users,
} from "lucide-react";
import { Badge, BooleanBadge } from "@/shared/components/ui/badges";
import { formatNumber, safeText } from "@/shared/lib/format";
import type { SchemaTable, SchemaTableType } from "./types";

/**
 * El tipo de tabla lleva icono y tono propios: en una lista de ciento cincuenta filas, distinguir
 * de un vistazo lo transaccional de lo auditable importa más que leer la palabra.
 */
const TYPE_META: Record<
  SchemaTableType | "unknown",
  {
    icon: typeof Table2;
    tone: "info" | "success" | "warning" | "default";
    label: string;
  }
> = {
  transactional: { icon: Table2, tone: "info", label: "Transaccional" },
  catalog: { icon: Boxes, tone: "success", label: "Catálogo" },
  audit: { icon: ScrollText, tone: "warning", label: "Auditoría" },
  operational: { icon: Gauge, tone: "default", label: "Operativa" },
  unknown: { icon: Table2, tone: "default", label: "—" },
};

/** Separa `iam.internal_users` en esquema y tabla. Sin punto, todo es nombre de tabla. */
export function splitQualifiedName(tableName: string): {
  schema: string | null;
  table: string;
} {
  const separator = tableName.indexOf(".");
  if (separator < 0) return { schema: null, table: tableName };
  return {
    schema: tableName.slice(0, separator),
    table: tableName.slice(separator + 1),
  };
}

export function buildSchemaTableColumns(): ColumnDef<SchemaTable>[] {
  return [
    {
      header: "Tabla",
      accessorKey: "tableName",
      cell: ({ row }) => {
        const { schema, table } = splitQualifiedName(row.original.tableName);
        return (
          <Link
            href={`/internal/schema/tables/${row.original._id}`}
            className="group inline-flex items-center gap-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-atlas-soft text-atlas-muted transition-colors group-hover:bg-atlas-accentSoft group-hover:text-atlas-accent">
              <Table2 className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="min-w-0">
              {schema ? (
                <span className="block font-mono text-[10px] uppercase tracking-wide text-atlas-muted">
                  {schema}
                </span>
              ) : null}
              <span className="block font-mono text-xs font-semibold text-atlas-text group-hover:text-atlas-accent group-hover:underline">
                {table}
              </span>
            </span>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-atlas-accent"
              aria-hidden
            />
          </Link>
        );
      },
    },
    {
      header: "Tipo",
      accessorKey: "tableType",
      cell: ({ row }) => {
        const meta = TYPE_META[row.original.tableType] ?? TYPE_META.unknown;
        return (
          <Badge tone={meta.tone}>
            <meta.icon className="h-3 w-3" aria-hidden />
            {meta.label}
          </Badge>
        );
      },
    },
    {
      header: "Append-only",
      accessorKey: "isAppendOnly",
      cell: ({ row }) =>
        row.original.isAppendOnly ? (
          <Badge tone="warning">
            <Lock className="h-3 w-3" aria-hidden />
            Solo alta
          </Badge>
        ) : (
          <BooleanBadge value={false} />
        ),
    },
    {
      header: "Multi-tenant",
      accessorKey: "isTenantScoped",
      cell: ({ row }) =>
        row.original.isTenantScoped ? (
          <Badge tone="info">
            <Users className="h-3 w-3" aria-hidden />
            Por tenant
          </Badge>
        ) : (
          <BooleanBadge value={false} />
        ),
    },
    {
      header: "Columnas",
      accessorKey: "columnsCount",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Columns3 className="h-3.5 w-3.5 text-atlas-muted" aria-hidden />
          {formatNumber(row.original.columnsCount)}
        </span>
      ),
    },
    {
      header: "Relaciones",
      accessorKey: "relationshipsCount",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Link2 className="h-3.5 w-3.5 text-atlas-muted" aria-hidden />
          {formatNumber(row.original.relationshipsCount)}
        </span>
      ),
    },
    {
      header: "Descripción",
      accessorKey: "description",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-xs text-atlas-muted">
          {safeText(row.original.description)}
        </span>
      ),
    },
  ];
}

"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusBadge } from "@/shared/components/ui/badges";

type FormRoute = {
  area: string;
  name: string;
  purpose: string;
  entryPoint: string;
  permission: string;
  status: string;
};

const formRoutes: FormRoute[] = [
  {
    area: "Catálogo",
    name: "Configurar tabla",
    purpose: "Metadata, PII, retención y regla append only/mutación.",
    entryPoint: "/internal/data-catalog/tables",
    permission: "catalog.data.manage",
    status: "disponible",
  },
  {
    area: "Gobierno",
    name: "Configurar política",
    purpose:
      "Acciones que backend debe obedecer: update, delete, export, auditoría.",
    entryPoint: "/internal/governance/policies",
    permission: "governance.policies.manage",
    status: "disponible",
  },
  {
    area: "Calidad",
    name: "Resolver issue",
    purpose: "Cierre idempotente con motivo y notas.",
    entryPoint: "/internal/data-quality/issues",
    permission: "dataQuality.issues.resolve",
    status: "disponible",
  },
  {
    area: "QA",
    name: "Ejecutar suite/regla/reporte",
    purpose: "Formularios operativos con confirmación explícita.",
    entryPoint: "/internal/qa/suites",
    permission: "systems.qa.execute",
    status: "disponible",
  },
];

const columns: ColumnDef<FormRoute>[] = [
  { header: "Área", accessorKey: "area" },
  {
    header: "Formulario",
    accessorKey: "name",
    cell: ({ row }) => (
      <Link
        className="font-semibold text-blue-700 hover:underline"
        href={row.original.entryPoint}
      >
        {row.original.name}
      </Link>
    ),
  },
  { header: "Propósito", accessorKey: "purpose" },
  { header: "Permiso", accessorKey: "permission" },
  {
    header: "Estado",
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
];

export function AdminFormsPage() {
  return (
    <PermissionGate permissions={[]}>
      <PageHeader
        eyebrow="Administración"
        title="Formularios disponibles"
        description="Mapa de formularios operativos. Las opciones de negocio se cargan desde cada módulo y no desde valores hardcodeados."
      />
      <DataTable data={formRoutes} columns={columns} />
    </PermissionGate>
  );
}

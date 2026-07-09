"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import type { GovernancePolicyDetail } from "./types";

type ScopeRow = { type: string; name: string };
const columns: ColumnDef<ScopeRow>[] = [
  { header: "Tipo", accessorKey: "type" },
  { header: "Activo", accessorKey: "name" },
];

export function PolicyScopeTable({
  policy,
}: Readonly<{ policy: GovernancePolicyDetail }>) {
  const rows = [
    ...(policy.affectedTables ?? []).map((name) => ({ type: "Tabla", name })),
    ...(policy.affectedColumns ?? []).map((name) => ({ type: "Campo", name })),
  ];

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Alcance de datos"
          description="Tablas y campos afectados por la política."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <DataTable
          data={rows}
          columns={columns}
          emptyTitle="Esta política no tiene alcance registrado."
        />
      </CardContent>
    </Card>
  );
}

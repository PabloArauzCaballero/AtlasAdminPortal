import type { ColumnDef } from "@tanstack/react-table";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime } from "@/shared/lib/format";
import { AlertActions } from "./alert-actions";
import type { OperationalAlert } from "./types";

export function buildAlertColumns(): ColumnDef<OperationalAlert>[] {
  return [
    {
      accessorKey: "title",
      header: "Alerta",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-atlas-text">{row.original.title}</p>
          <p className="text-xs text-atlas-muted">
            {row.original.description ?? "Sin descripción"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "severity",
      header: "Severidad",
      cell: ({ row }) => <RiskBadge value={row.original.severity} />,
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    { accessorKey: "source", header: "Fuente" },
    { accessorKey: "resourceType", header: "Recurso" },
    {
      accessorKey: "createdAt",
      header: "Creada",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      accessorKey: "acknowledgedAt",
      header: "Reconocida",
      cell: ({ row }) => formatDateTime(row.original.acknowledgedAt),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) =>
        row.original.acknowledgedAt ? null : (
          <AlertActions alertId={row.original.alertId} />
        ),
    },
  ];
}

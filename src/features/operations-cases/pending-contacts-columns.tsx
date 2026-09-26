"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { MailCheck } from "lucide-react";
import type { PendingContactVerificationItem } from "./types";

function contactLabel(item: PendingContactVerificationItem): string {
  if (item.contactType === "email")
    return `correo ···${safeText(item.valueLast4)}${item.emailDomain ? `@${item.emailDomain}` : ""}`;
  if (item.contactType === "phone")
    return `teléfono ···${safeText(item.valueLast4)}`;
  return safeText(item.contactType);
}

export function buildPendingContactsColumns(
  onResend: (item: PendingContactVerificationItem) => void,
  sendingId: string | null,
): ColumnDef<PendingContactVerificationItem>[] {
  return [
    {
      header: "Cliente",
      accessorKey: "customerCode",
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            href={`/internal/operations/customers/${row.original.customerId}/investigation-summary`}
            className="font-mono text-xs text-atlas-primary hover:underline"
          >
            {safeText(row.original.customerCode)}
          </Link>
          <p className="font-mono text-[0.6875rem] text-atlas-muted">
            #{row.original.customerId}
          </p>
        </div>
      ),
    },
    {
      header: "Contacto sin verificar",
      accessorKey: "contactType",
      cell: ({ row }) => (
        <span className="text-sm">
          {contactLabel(row.original)}
          {row.original.isPrimary ? (
            <Badge tone="info" className="ml-2">
              Primario
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      header: "Estado del cliente",
      accessorKey: "lifecycleStatus",
      cell: ({ row }) => <StatusBadge value={row.original.lifecycleStatus} />,
    },
    {
      header: "Declarado",
      accessorKey: "contactCreatedAt",
      cell: ({ row }) => formatDateTime(row.original.contactCreatedAt),
    },
    {
      header: "Registrado",
      accessorKey: "customerCreatedAt",
      cell: ({ row }) => formatDateTime(row.original.customerCreatedAt),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="secondary"
          disabled={sendingId === row.original.contactMethodId}
          onClick={() => onResend(row.original)}
        >
          <MailCheck className="h-3.5 w-3.5" />
          {row.original.contactType === "phone"
            ? "Reenviar SMS"
            : "Reenviar correo"}
        </Button>
      ),
    },
  ];
}

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { Option } from "@/shared/lib/options";
import { onboardingStatusLabel, qrKindLabel } from "./labels";
import type { PartnerQrPending } from "./types";

/** Los dos tipos de QR que admite el servidor (`partner_qr_codes_tipo_conocido`). */
export const TIPO_QR_OPTIONS: Option[] = [
  {
    value: "business",
    label: "QR del negocio",
    description: "El código con el que el comercio cobra como negocio.",
  },
  {
    value: "bank",
    label: "QR bancario (cobro)",
    description: "El código de una cuenta bancaria concreta del comercio.",
  },
];

export const nombreDelComercio = (qr: PartnerQrPending) =>
  safeText(qr.partner?.tradeName ?? qr.partner?.legalName);

/** La cola de QR de cobro: cada fila es un código que espera a una persona. */
export function buildQrColumns(
  alRevisar: (qr: PartnerQrPending) => void,
): ColumnDef<PartnerQrPending>[] {
  return [
    {
      header: "Comercio",
      id: "comercio",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-atlas-text">
            {nombreDelComercio(row.original)}
          </p>
          <p className="truncate font-mono text-xs text-atlas-muted">
            {row.original.partner?.taxId
              ? `NIT ${row.original.partner.taxId} · `
              : ""}
            n.º {row.original.partnerId}
          </p>
          {row.original.partner ? (
            <p className="text-xs text-atlas-muted">
              Comercio{" "}
              {onboardingStatusLabel(
                row.original.partner.onboardingStatus,
              ).toLowerCase()}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      header: "Tipo",
      accessorKey: "qrKind",
      cell: ({ row }) => (
        <Badge tone="info">{qrKindLabel(row.original.qrKind)}</Badge>
      ),
    },
    {
      header: "Sucursal",
      id: "sucursal",
      cell: ({ row }) =>
        row.original.branch ? (
          <div className="min-w-0">
            <p className="truncate text-sm text-atlas-text">
              {row.original.branch.name}
            </p>
            <p className="font-mono text-xs text-atlas-muted">
              {row.original.branch.branchCode}
            </p>
          </div>
        ) : (
          <span className="text-xs text-atlas-muted">
            {row.original.branchId
              ? `Sucursal n.º ${row.original.branchId}`
              : "Comercio entero"}
          </span>
        ),
    },
    {
      header: "Entidad",
      accessorKey: "bankInstitutionCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.bankInstitutionCode ?? "—"}
        </span>
      ),
    },
    {
      header: "Cuenta",
      accessorKey: "accountNumberMasked",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.accountNumberMasked ?? "—"}
        </span>
      ),
    },
    {
      header: "Huella del archivo",
      accessorKey: "fingerprint",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.fingerprint}</span>
      ),
    },
    {
      header: "Subido",
      accessorKey: "createdAt",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      header: "",
      id: "accion",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <Button
          className="h-8 px-2 text-xs"
          aria-label={`Revisar el ${qrKindLabel(row.original.qrKind)} de ${nombreDelComercio(row.original)}`}
          onClick={() => alRevisar(row.original)}
        >
          Revisar
        </Button>
      ),
    },
  ];
}

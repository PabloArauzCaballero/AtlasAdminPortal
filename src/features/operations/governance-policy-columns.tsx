"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { formatBoolean, formatNumber, safeText } from "@/shared/lib/format";
import {
  GOVERNANCE_POLICY_TYPE_OPTIONS,
  type GovernancePolicyEntry,
} from "./governance-policy-search";

const text = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : null;

/** Lo que controla cada política, dicho en palabras y según su tipo. */
export function policyControl(entry: GovernancePolicyEntry): string {
  const a = entry.attributes;
  switch (entry.type) {
    case "purpose":
      return a.requiresExplicitConsent
        ? "Consentimiento explícito"
        : "Sin consentimiento explícito";
    case "retention":
      return `${formatNumber(text(a.retentionDays))} días · ${safeText(text(a.postRetentionAction))}`;
    case "classification":
      return `Cifrado: ${formatBoolean(Boolean(a.encryptionRequired))} · Hash: ${formatBoolean(Boolean(a.hashingRequired))}`;
    case "sensitive":
      return `${safeText(text(a.storageMode))} · enmascarado ${safeText(text(a.maskingStrategy))}`;
    case "quality":
      return `${safeText(text(a.severity))} · ${safeText(text(a.expectedAction))}`;
    default:
      return "—";
  }
}

const typeLabel = (type: string) =>
  GOVERNANCE_POLICY_TYPE_OPTIONS.find((option) => option.value === type)
    ?.label ?? type;

export function buildGovernancePolicyColumns(): ColumnDef<GovernancePolicyEntry>[] {
  return withoutClientSorting<GovernancePolicyEntry>([
    {
      header: "Tipo",
      accessorKey: "type",
      cell: ({ row }) => (
        <Badge tone="info">{typeLabel(row.original.type)}</Badge>
      ),
    },
    {
      header: "Código",
      accessorKey: "code",
      cell: ({ row }) => (
        <Link
          className="font-mono text-xs font-semibold text-atlas-accent underline"
          href={`/internal/governance/policies/${encodeURIComponent(row.original.policyId)}`}
        >
          {safeText(row.original.code)}
        </Link>
      ),
    },
    {
      header: "Nombre",
      accessorKey: "name",
      cell: ({ row }) => safeText(row.original.name),
    },
    {
      header: "Alcance",
      accessorKey: "scope",
      cell: ({ row }) => (
        <span className="text-xs">{safeText(row.original.scope)}</span>
      ),
    },
    {
      header: "Control",
      id: "control",
      cell: ({ row }) => (
        <span className="text-xs">{policyControl(row.original)}</span>
      ),
    },
    {
      header: "Estado",
      accessorKey: "isActive",
      cell: ({ row }) => (
        <StatusBadge value={row.original.isActive ? "active" : "inactive"} />
      ),
    },
  ]);
}

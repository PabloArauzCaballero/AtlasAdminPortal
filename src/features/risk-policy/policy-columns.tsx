import type { ColumnDef } from "@tanstack/react-table";
import type { RiskPolicyCurrent } from "@/features/operations/types";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime } from "@/shared/lib/format";
import { riskPolicyLabel } from "./risk-policy-labels";

export type RuleRow =
  RiskPolicyCurrent["rulesetVersions"][number]["rules"][number] & {
    ruleset: string;
    rulesetStatus: string;
  };

export type RulesetVersionRow = RiskPolicyCurrent["rulesetVersions"][number];

export const RULE_COLUMNS: ColumnDef<RuleRow>[] = [
  {
    header: "Ruleset",
    accessorKey: "ruleset",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.ruleset}</span>
    ),
  },
  {
    header: "Regla",
    accessorKey: "ruleName",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.ruleName}</span>
    ),
  },
  {
    header: "Código",
    accessorKey: "ruleCode",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.ruleCode}</span>
    ),
  },
  {
    header: "Dimensión",
    accessorKey: "riskDimension",
    cell: ({ row }) => riskPolicyLabel.dimension(row.original.riskDimension),
  },
  {
    header: "Tipo",
    accessorKey: "ruleType",
    cell: ({ row }) => riskPolicyLabel.ruleType(row.original.ruleType),
  },
  {
    header: "Severidad",
    accessorKey: "severity",
    cell: ({ row }) => riskPolicyLabel.severity(row.original.severity),
  },
  {
    header: "Acción",
    accessorKey: "actionCode",
    cell: ({ row }) => riskPolicyLabel.action(row.original.actionCode),
  },
  {
    header: "Hard stop",
    accessorKey: "isHardStop",
    cell: ({ row }) => (row.original.isHardStop ? "Sí" : "No"),
  },
];

export const RULESET_COLUMNS: ColumnDef<RulesetVersionRow>[] = [
  {
    header: "Ruleset",
    accessorFn: (r) => `${r.rulesetCode}@${r.versionCode}`,
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold">
        {row.original.rulesetCode}@{row.original.versionCode}
      </span>
    ),
  },
  {
    header: "Tipo",
    accessorFn: (r) => riskPolicyLabel.assessmentType(r.assessmentType),
  },
  {
    header: "Estado",
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
  {
    header: "Desde",
    accessorKey: "effectiveFrom",
    cell: ({ row }) => formatDateTime(row.original.effectiveFrom),
  },
  {
    header: "Hasta",
    accessorKey: "effectiveUntil",
    cell: ({ row }) => formatDateTime(row.original.effectiveUntil),
  },
  {
    header: "Reglas",
    accessorFn: (r) => r.rules.length,
  },
];

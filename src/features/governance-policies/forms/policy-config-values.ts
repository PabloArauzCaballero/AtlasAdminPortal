import type {
  GovernancePolicyConfigInput,
  GovernancePolicyDetail,
} from "../types";

export const policyMutationModes = [
  { value: "append_only", label: "Append only" },
  { value: "append_update", label: "Append + actualización" },
  { value: "mutable", label: "Mutable controlado" },
  { value: "read_only", label: "Solo lectura" },
];

export function policyConfigFrom(
  policy: GovernancePolicyDetail,
): GovernancePolicyConfigInput {
  const metadata = policy.metadata ?? {};
  return {
    name: policy.name ?? "",
    description: policy.description ?? "",
    owner: policy.owner ?? "",
    status: policy.status ?? "active",
    policyType: policy.policyType ?? "governance",
    version: policy.version ?? "",
    scope: {
      affectedTables: toLines(policy.affectedTables),
      affectedColumns: toLines(policy.affectedColumns),
    },
    enforcement: {
      mutationMode: String(metadata.mutationMode ?? "append_update"),
      appendOnly: Boolean(metadata.appendOnly),
      updateAllowed: Boolean(metadata.updateAllowed),
      deleteAllowed: Boolean(metadata.deleteAllowed),
      hardDeleteAllowed: Boolean(metadata.hardDeleteAllowed),
      exportAllowed: Boolean(metadata.exportAllowed),
      approvalRequired: Boolean(metadata.approvalRequired),
      reasonRequired: Boolean(metadata.reasonRequired),
      auditRequired: Boolean(metadata.auditRequired ?? true),
      maskingStrategy: String(metadata.maskingStrategy ?? ""),
      retentionDays: String(metadata.retentionDays ?? ""),
    },
  };
}

function toLines(values?: string[]) {
  return values?.join("\n") ?? "";
}

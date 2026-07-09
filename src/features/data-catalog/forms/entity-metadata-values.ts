import type {
  DataEntity,
  DataEntityMetadataInput,
} from "@/features/systems/types";

export const mutationModes = [
  { value: "append_only", label: "Append only" },
  { value: "append_update", label: "Append + actualización controlada" },
  { value: "mutable", label: "Mutable" },
  { value: "read_only", label: "Solo lectura" },
];

export function metadataValuesFrom(
  entity: DataEntity,
): DataEntityMetadataInput {
  const config = entity.governanceConfig ?? {};
  const mode = String(config.mutationMode ?? inferredMode(entity));
  return {
    entityName: entity.entityName ?? "",
    businessPurpose: entity.businessPurpose ?? "",
    dataOwner: entity.dataOwner ?? "",
    module: entity.module ?? "",
    retentionPolicyCode: entity.retentionPolicyCode ?? "",
    status: entity.status ?? "active",
    containsPii: Boolean(entity.containsPii),
    containsFinancialData: Boolean(entity.containsFinancialData),
    containsRiskData: Boolean(entity.containsRiskData),
    containsLegalData: Boolean(entity.containsLegalData),
    containsDeviceData: Boolean(entity.containsDeviceData),
    containsLocationData: Boolean(entity.containsLocationData),
    isAuditCritical: Boolean(entity.isAuditCritical),
    governance: {
      mutationMode: mode,
      appendOnly: Boolean(config.appendOnly ?? entity.isAppendOnly),
      updatesAllowed: Boolean(config.updatesAllowed ?? entity.allowsUpdates),
      deletesAllowed: Boolean(config.deletesAllowed ?? entity.allowsDeletes),
      hardDeleteAllowed: Boolean(
        config.hardDeleteAllowed ?? entity.allowsHardDeletes,
      ),
      approvalRequired: Boolean(
        config.approvalRequired ?? entity.requiresApproval,
      ),
      notes: String(config.notes ?? ""),
    },
  };
}

function inferredMode(entity: DataEntity) {
  if (entity.isAppendOnly) return "append_only";
  if (entity.allowsUpdates || entity.allowsDeletes) return "mutable";
  return "append_update";
}

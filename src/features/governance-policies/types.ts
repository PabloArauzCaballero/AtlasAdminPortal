import type { JsonRecord } from "@/shared/api/types";

export type GovernancePolicyAction = {
  actionId?: string;
  actionKey?: string;
  name?: string;
  description?: string | null;
  operation?: string | null;
  enabled?: boolean | null;
  requiresApproval?: boolean | null;
  requiresReason?: boolean | null;
  requiresAudit?: boolean | null;
  config?: JsonRecord | null;
};

export type GovernancePolicyDetail = {
  policyId: string;
  key: string;
  name: string;
  policyType: string;
  status: string;
  version: string | null;
  owner: string | null;
  description: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  affectedTables?: string[];
  affectedColumns?: string[];
  controls?: Array<{
    controlId: string;
    controlType: string;
    label: string;
    status: string;
    config: JsonRecord | null;
  }>;
  actions?: GovernancePolicyAction[];
  approvals?: Array<{
    approvalId: string;
    status: string;
    actor: string | null;
    decidedAt: string | null;
    comment: string | null;
  }>;
  metadata?: JsonRecord | null;
  updatedAt?: string | null;
};

export type GovernancePolicyConfigInput = {
  name: string;
  description: string;
  owner: string;
  status: string;
  policyType: string;
  version: string;
  scope: {
    affectedTables: string;
    affectedColumns: string;
  };
  enforcement: {
    mutationMode: string;
    appendOnly: boolean;
    updateAllowed: boolean;
    deleteAllowed: boolean;
    hardDeleteAllowed: boolean;
    exportAllowed: boolean;
    approvalRequired: boolean;
    reasonRequired: boolean;
    auditRequired: boolean;
    maskingStrategy: string;
    retentionDays: string;
  };
};

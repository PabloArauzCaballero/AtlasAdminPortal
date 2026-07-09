import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type BusinessTerm = {
  termId: string;
  key: string;
  name: string;
  definition: string | null;
  domain: string | null;
  owner: string | null;
  status: string;
  relatedTables?: string[];
  relatedColumns?: string[];
  relatedReports?: string[];
  metadata?: JsonRecord | null;
  updatedAt?: string | null;
};

export type BusinessTermDetail = BusinessTerm & {
  synonyms?: string[];
  examples?: string[];
  restrictions?: string[];
  relations?: Array<{
    relationId: string;
    relationType: string;
    targetType: string;
    targetId: string;
    targetLabel: string;
  }>;
  audit?: Array<{
    auditId: string;
    action: string;
    actor: string | null;
    createdAt: string | null;
  }>;
};

export type BusinessTermListResponse = PaginatedResponse<BusinessTerm>;

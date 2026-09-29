import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type BusinessTerm = {
  termId: string;
  key: string;
  name: string;
  definition: string | null;
  domain: string | null;
  owner: string | null;
  status: string;
  /** Dominio, tabla o campo. Lo declara el servidor; un Core anterior no lo manda. */
  type?: BusinessTermType;
  relatedTables?: string[];
  relatedColumns?: string[];
  relatedEndpoints?: string[];
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
    sourceTable?: string;
    sourceColumn?: string | null;
    targetTable?: string;
    targetColumn?: string | null;
  }>;
  audit?: Array<{
    auditId: string;
    action: string;
    actor: string | null;
    createdAt: string | null;
  }>;
};

export type BusinessTermListResponse = PaginatedResponse<BusinessTerm>;

export type BusinessTermType = "domain" | "table" | "field";

export type FacetCount = { value: string; total: number };

export type BusinessTermFacets = { domains: FacetCount[]; types: FacetCount[] };

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/shared/api/client";
import type {
  JsonRecord,
  PaginatedResponse,
  QueryParams,
} from "@/shared/api/types";
import type { Option } from "@/shared/lib/options";

/**
 * Una política de gobierno en la lista paginada `GET /operations/data-governance/policies/search`.
 * `policyId` (`purpose:12`, `quality:3`…) es el que abre su ficha en `/internal/governance/policies/[policyId]`.
 */
export type GovernancePolicyEntry = {
  policyId: string;
  type: GovernancePolicyType;
  code: string | null;
  name: string | null;
  scope: string | null;
  isActive: boolean;
  attributes: JsonRecord;
};

export type GovernancePolicyType =
  "purpose" | "retention" | "classification" | "sensitive" | "quality";

export type GovernancePolicySearchResponse =
  PaginatedResponse<GovernancePolicyEntry> & {
    summary: {
      total: number;
      byType: Partial<Record<GovernancePolicyType, number>>;
      sensitiveFields: number;
      explicitConsent: number;
      protectedClasses: number;
    };
  };

export const GOVERNANCE_POLICY_TYPE_OPTIONS: Option[] = [
  {
    value: "purpose",
    label: "Propósito de tratamiento",
    description: "Para qué se usan los datos y con qué base legal.",
  },
  {
    value: "retention",
    label: "Retención",
    description: "Cuántos días se conserva un dato y qué pasa después.",
  },
  {
    value: "classification",
    label: "Clasificación",
    description: "Nivel de sensibilidad y cómo se guarda cada clase de dato.",
  },
  {
    value: "sensitive",
    label: "Campo sensible",
    description: "Un campo concreto con enmascarado y acceso restringido.",
  },
  {
    value: "quality",
    label: "Regla de calidad",
    description: "Una regla activa que marca datos que no cumplen el estándar.",
  },
];

export function searchGovernancePolicies(query: QueryParams) {
  return apiRequest<GovernancePolicySearchResponse>(
    "/operations/data-governance/policies/search",
    { query },
  );
}

export function useGovernancePolicySearch(query: QueryParams) {
  return useQuery({
    queryKey: ["operations", "data-governance", "policies", "search", query],
    queryFn: () => searchGovernancePolicies(query),
    // Cambiar de página o de filtro no vacía la tabla mientras llega la siguiente.
    placeholderData: keepPreviousData,
  });
}

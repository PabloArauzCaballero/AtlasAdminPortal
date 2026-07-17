"use client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  activateRiskRulesetVersion,
  createCatalogVersion,
  createRiskRulesetVersion,
  decideCatalogVersion,
  getCatalogVersion,
  getCurrentRiskPolicy,
  getDataGovernancePolicies,
  ingestCatalog,
  listDataQualityIssues,
  listDefinitions,
  listOperationCatalogs,
  resolveDataQualityIssue,
  submitCatalogVersion,
  upsertDataGovernancePackage,
  upsertDefinitionsPackage,
} from "./services";
import type { DefinitionsPackageInput } from "./definitions-package-schema";
import type { DataGovernancePolicyPackageInput } from "./governance-package-schema";
import type { CreateRiskRulesetVersionInput } from "./risk-ruleset-schema";
import type {
  ActivateRulesetInput,
  CatalogDecisionInput,
  CatalogIngestionInput,
  CreateCatalogVersionInput,
  SubmitCatalogVersionInput,
} from "./catalog-version-types";
import type { ResolveDataQualityIssueInput } from "./types";

/**
 * Todas las escrituras de catálogo invalidan la raíz `["operations"]` y no solo
 * la key de la versión tocada: crear/aprobar/publicar una versión cambia
 * también el `currentVersion` que devuelve `/operations/catalogs` (el backend
 * expone ahí la versión más reciente, no la activa), y los paquetes reescriben
 * definiciones, política de riesgo y gobernanza a la vez. Invalidar por rama
 * dejaba el listado mostrando el estado anterior.
 */
async function invalidateOperations(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ["operations"] });
}
export function useOperationCatalogs(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.operationCatalogs(query),
    queryFn: () => listOperationCatalogs(query),
  });
}
export function useCatalogVersion(catalogCode: string, versionId: string) {
  return useQuery({
    queryKey: queryKeys.catalogVersion(catalogCode, versionId),
    queryFn: () => getCatalogVersion(catalogCode, versionId),
    enabled: Boolean(catalogCode) && Boolean(versionId),
  });
}

export function useCreateCatalogVersionMutation(catalogCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCatalogVersionInput) =>
      createCatalogVersion(catalogCode, body),
    onSuccess: async () => {
      await invalidateOperations(queryClient);
    },
  });
}

export function useSubmitCatalogVersionMutation(
  catalogCode: string,
  versionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitCatalogVersionInput) =>
      submitCatalogVersion(catalogCode, versionId, body),
    onSuccess: async () => {
      await invalidateOperations(queryClient);
    },
  });
}

export function useDecideCatalogVersionMutation(
  catalogCode: string,
  versionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CatalogDecisionInput) =>
      decideCatalogVersion(catalogCode, versionId, body),
    onSuccess: async () => {
      await invalidateOperations(queryClient);
    },
  });
}

export function useIngestCatalogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CatalogIngestionInput) => ingestCatalog(body),
    onSuccess: async () => {
      await invalidateOperations(queryClient);
    },
  });
}

export function useUpsertDefinitionsPackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DefinitionsPackageInput) =>
      upsertDefinitionsPackage(body),
    onSuccess: async () => {
      await invalidateOperations(queryClient);
    },
  });
}

export function useCreateRiskRulesetVersionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRiskRulesetVersionInput) =>
      createRiskRulesetVersion(body),
    onSuccess: async () => {
      await invalidateOperations(queryClient);
    },
  });
}

export function useActivateRulesetVersionMutation(rulesetVersionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ActivateRulesetInput) =>
      activateRiskRulesetVersion(rulesetVersionId, body),
    onSuccess: async () => {
      await invalidateOperations(queryClient);
    },
  });
}

export function useUpsertGovernancePackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DataGovernancePolicyPackageInput) =>
      upsertDataGovernancePackage(body),
    onSuccess: async () => {
      await invalidateOperations(queryClient);
    },
  });
}

export function useDefinitions(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.definitions(query),
    queryFn: () => listDefinitions(query),
  });
}
export function useDataGovernancePolicies() {
  return useQuery({
    queryKey: queryKeys.dataGovernancePolicies,
    queryFn: getDataGovernancePolicies,
  });
}
export function useCurrentRiskPolicy() {
  return useQuery({
    queryKey: queryKeys.currentRiskPolicy,
    queryFn: getCurrentRiskPolicy,
  });
}
export function useDataQualityIssues(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.dataQualityIssues(query),
    queryFn: () => listDataQualityIssues(query),
  });
}
export function useResolveDataQualityIssueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      issueId: string;
      body: ResolveDataQualityIssueInput;
    }) => resolveDataQualityIssue(input.issueId, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["operations", "data-quality"],
      });
    },
  });
}

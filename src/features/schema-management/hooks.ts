"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  approveSchemaChange,
  getSchemaTable,
  getSchemaVersion,
  listSchemaChangeLog,
  listSchemaTables,
  listSchemaVersions,
  proposeSchemaTable,
} from "./services";
import type {
  ApproveSchemaChangeInput,
  ProposeSchemaTableInput,
} from "./types";

export function useSchemaVersions(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.schemaVersions(query),
    queryFn: () => listSchemaVersions(query),
  });
}

export function useSchemaVersion(versionId: string) {
  return useQuery({
    queryKey: queryKeys.schemaVersion(versionId),
    queryFn: () => getSchemaVersion(versionId),
    enabled: Boolean(versionId),
  });
}

export function useSchemaTables(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.schemaTables(query),
    queryFn: () => listSchemaTables(query),
    enabled: Boolean(query.versionId),
  });
}

export function useSchemaTable(tableId: string) {
  return useQuery({
    queryKey: queryKeys.schemaTable(tableId),
    queryFn: () => getSchemaTable(tableId),
    enabled: Boolean(tableId),
  });
}

export function useProposeSchemaTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProposeSchemaTableInput) => proposeSchemaTable(body),
    // Proponer una tabla no solo agrega una entrada al change-log: deja stale
    // versiones, tablas y sus contadores. Se invalida la raíz del dominio.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schema"] });
    },
  });
}

export function useSchemaChangeLog(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.schemaChangeLog(query),
    queryFn: () => listSchemaChangeLog(query),
  });
}

export function useApproveSchemaChangeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { changeId: string; body: ApproveSchemaChangeInput }) =>
      approveSchemaChange(input.changeId, input.body),
    // Aprobar/rechazar un cambio altera versiones y tablas, no solo el log.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schema"] });
    },
  });
}

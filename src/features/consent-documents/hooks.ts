"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listConsentDocuments,
  publishConsentDocument,
  updateConsentDocument,
} from "./services";
import type {
  ConsentDocumentCreate,
  ConsentDocumentQuery,
  ConsentDocumentUpdate,
} from "./types";

const KEY = ["consent-documents"] as const;

export function useConsentDocuments(query: ConsentDocumentQuery = {}) {
  return useQuery({
    queryKey: [...KEY, query],
    queryFn: () => listConsentDocuments(query),
    // Cambiar de página o de filtro no vacía la tabla: se ve la anterior hasta que llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export function useUpdateConsentDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; body: ConsentDocumentUpdate }) =>
      updateConsentDocument(input.id, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function usePublishConsentDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ConsentDocumentCreate) => publishConsentDocument(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

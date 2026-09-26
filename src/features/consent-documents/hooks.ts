"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listConsentDocuments,
  publishConsentDocument,
  updateConsentDocument,
} from "./services";
import type { ConsentDocumentCreate, ConsentDocumentUpdate } from "./types";

const KEY = ["consent-documents"] as const;

export function useConsentDocuments() {
  return useQuery({ queryKey: KEY, queryFn: listConsentDocuments });
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

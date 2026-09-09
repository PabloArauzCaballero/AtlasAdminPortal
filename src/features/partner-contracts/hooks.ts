"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDefaultContractTemplate,
  listContractTemplates,
  publishContractTemplate,
  setDefaultContractTemplate,
} from "./services";
import type { PublishContractTemplate } from "./types";

const KEY = ["partner-contract-templates"] as const;

export function useContractTemplates() {
  return useQuery({ queryKey: KEY, queryFn: listContractTemplates });
}

export function useDefaultContractTemplate() {
  return useQuery({
    queryKey: [...KEY, "default"],
    queryFn: getDefaultContractTemplate,
  });
}

/** Publicar y cambiar el predeterminado mueven las DOS consultas: la lista y el vigente. */
function useContratoMutation<TInput>(accion: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function usePublishContractTemplate() {
  return useContratoMutation((body: PublishContractTemplate) =>
    publishContractTemplate(body),
  );
}

export function useSetDefaultContractTemplate() {
  return useContratoMutation((templateId: string) =>
    setDefaultContractTemplate(templateId),
  );
}

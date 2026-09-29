import { apiRequest } from "@/shared/api/client";
import type {
  ContractTemplateQuery,
  PartnerContractDefault,
  PartnerContractTemplateList,
  PublishContractTemplate,
} from "./types";

const BASE = "/operations/partner-contract-templates";

/**
 * Las versiones, vigentes y archivadas: las archivadas son la prueba de qué regía cada día. Pagina,
 * busca por código y nombre, y filtra por estado EN EL SERVIDOR.
 */
export function listContractTemplates(query: ContractTemplateQuery = {}) {
  return apiRequest<PartnerContractTemplateList>(BASE, {
    query: {
      page: query.page,
      limit: query.limit,
      q: query.q?.trim() || undefined,
      status: query.status || undefined,
    },
  });
}

/** Responde `{ template: null }` cuando el inquilino no publicó ninguno todavía. No es un error. */
export function getDefaultContractTemplate() {
  return apiRequest<PartnerContractDefault>(`${BASE}/default`);
}

/**
 * Publica una versión nueva. El cuerpo NO se edita: cada publicación crea una versión y archiva la
 * anterior, porque un contrato es la evidencia de a qué se comprometió alguien un día concreto.
 * La versión la calcula el backend.
 */
export function publishContractTemplate(body: PublishContractTemplate) {
  return apiRequest<unknown>(BASE, { method: "POST", body });
}

export function setDefaultContractTemplate(templateId: string) {
  return apiRequest<unknown>(
    `${BASE}/${encodeURIComponent(templateId)}/default`,
    { method: "PATCH" },
  );
}

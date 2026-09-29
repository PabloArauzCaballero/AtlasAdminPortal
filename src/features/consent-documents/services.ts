import { apiRequest } from "@/shared/api/client";
import type {
  ConsentDocumentCreate,
  ConsentDocumentList,
  ConsentDocumentQuery,
  ConsentDocumentUpdate,
} from "./types";

/** El listado paginado del portal: el buscador y el estado viajan al servidor. */
export function listConsentDocuments(query: ConsentDocumentQuery = {}) {
  return apiRequest<ConsentDocumentList>("/operations/consent-documents", {
    query: {
      page: query.page,
      limit: query.limit,
      q: query.q?.trim() || undefined,
      status: query.status || undefined,
    },
  });
}

export function updateConsentDocument(
  documentId: string,
  body: ConsentDocumentUpdate,
) {
  return apiRequest<unknown>(`/operations/consent-documents/${documentId}`, {
    method: "PATCH",
    body,
  });
}

export function publishConsentDocument(body: ConsentDocumentCreate) {
  return apiRequest<unknown>("/operations/consent-documents", {
    method: "POST",
    body,
  });
}

import { apiRequest } from "@/shared/api/client";
import type {
  ConsentDocumentCreate,
  ConsentDocumentList,
  ConsentDocumentUpdate,
} from "./types";

export function listConsentDocuments() {
  return apiRequest<ConsentDocumentList>("/operations/consent-documents");
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

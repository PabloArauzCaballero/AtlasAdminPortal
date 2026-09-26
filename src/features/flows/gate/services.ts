import { apiRequest } from "@/shared/api/client";
import type { DocumentationGate } from "./types";

export function getDocumentationGate() {
  return apiRequest<DocumentationGate>("/systems/flows/documentation-gate");
}

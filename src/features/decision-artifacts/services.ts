import { apiRequest } from "@/shared/api/client";
import type { AssignArtifactBody, DecisionArtifactsResponse } from "./types";

export function listDecisionArtifacts() {
  return apiRequest<DecisionArtifactsResponse>("/internal/decision-artifacts");
}

/**
 * Elegir el artefacto de un tipo de decision.
 *
 * El backend valida el codigo contra el catalogo que publica el motor y rechaza los que no existen:
 * es la razon de ser de esta pantalla. Escribir el codigo a mano fue lo que llevo a apuntar el
 * credito a `credit_underwriting` —que en el motor se llama de otra forma— y a que cada solicitud
 * muriera en un 404 silencioso.
 */
export function assignDecisionArtifact(body: AssignArtifactBody) {
  return apiRequest<unknown>("/internal/decision-artifacts", { method: "POST", body });
}

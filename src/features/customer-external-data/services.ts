import { apiRequest } from "@/shared/api/client";
import type { JsonRecord } from "@/shared/api/types";

/**
 * Datos externos de un cliente: consentimiento, petición y resultado.
 *
 * Once rutas de `/external-data` más las de confianza digital, todas sin pantalla. El módulo existe
 * para «incorporar evidencia KYC, financiera y de confianza con control de costo, consentimiento y
 * disponibilidad», y sin consola no se podía hacer ninguna de las tres cosas que lo hacen
 * gobernable: ver qué consintió el cliente, estimar lo que cuesta una consulta antes de lanzarla, y
 * mirar el paquete con el que se decidió.
 *
 * La gobernanza del PROVEEDOR (costos, kill-switch, SLA, rotación de credenciales) no está aquí:
 * vive en «Proveedores externos», que la cubre entera con el prefijo `/admin/external-providers`.
 * Esto es la otra mitad, la del cliente.
 */

export function listCustomerConsents(customerId: string) {
  return apiRequest<JsonRecord>(
    `/external-data/consents/user/${encodeURIComponent(customerId)}`,
  );
}

export function grantConsent(body: {
  customerId: string;
  purpose: string;
  providerCode?: string;
  accepted: boolean;
}) {
  return apiRequest<JsonRecord>("/external-data/consents", {
    method: "POST",
    body: { ...body, channel: "internal_portal" },
  });
}

export function revokeConsent(consentId: string) {
  return apiRequest<JsonRecord>(
    `/external-data/consents/${encodeURIComponent(consentId)}/revoke`,
    { method: "POST" },
  );
}

/**
 * Estimar antes de gastar.
 *
 * La vista previa dice qué política aplica y qué costaría la consulta SIN pedirla al proveedor. Es
 * lo que separa una consulta gobernada de una factura sorpresa.
 */
export function previewDataRequest(body: JsonRecord) {
  return apiRequest<JsonRecord>("/external-data/requests/preview", {
    method: "POST",
    body,
  });
}

export function createDataRequest(body: JsonRecord) {
  return apiRequest<JsonRecord>("/external-data/requests", {
    method: "POST",
    body,
  });
}

export function getDataRequest(requestId: string) {
  return apiRequest<JsonRecord>(
    `/external-data/requests/${encodeURIComponent(requestId)}`,
  );
}

export function getProvidersHealth() {
  return apiRequest<JsonRecord>("/external-data/providers/health");
}

/** Las cuatro lecturas del cliente: de la más cruda a la más elaborada. */
export type CustomerDataset =
  | "observations"
  | "features"
  | "scoring-input"
  | "decision-package";

export function getCustomerDataset(customerId: string, dataset: CustomerDataset) {
  return apiRequest<JsonRecord>(
    `/external-data/users/${encodeURIComponent(customerId)}/${dataset}`,
  );
}

export function getDigitalTrustProfile(customerId: string) {
  return apiRequest<JsonRecord>(
    `/digital-trust/profile/${encodeURIComponent(customerId)}`,
  );
}

export function runDigitalTrustCheck(body: {
  customerId: string;
  email?: string;
  phoneNumber?: string;
}) {
  return apiRequest<JsonRecord>("/digital-trust/check", { method: "POST", body });
}

export function getFacebookStatus(customerId: string) {
  return apiRequest<JsonRecord>(
    `/social/facebook/status/${encodeURIComponent(customerId)}`,
  );
}

/**
 * El enlace de conexión se GENERA aquí y lo abre el cliente, no el operador.
 *
 * El `callback` de OAuth no aparece en esta consola a propósito: lo llama Facebook contra el
 * backend cuando el cliente autoriza, no una persona desde una pantalla.
 */
export function getFacebookConnectUrl(customerId: string) {
  return apiRequest<JsonRecord>("/social/facebook/connect-url", {
    query: { customerId },
  });
}

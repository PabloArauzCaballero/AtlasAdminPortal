import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  InternalSessionsListResponse,
  RevokeInternalSessionsResult,
} from "./types";

export function listInternalSessions(query?: QueryParams) {
  return apiRequest<InternalSessionsListResponse>("/internal/sessions", {
    query,
  });
}

/**
 * Cierra TODAS las sesiones de una persona. El backend revoca sus tokens y sube su versión de token, así
 * que queda fuera en su siguiente petición, no al cabo de una hora. Exige motivo: queda en la auditoría.
 */
export function revokeInternalSessions(internalUserId: string, reason: string) {
  return apiRequest<RevokeInternalSessionsResult>(
    `/internal/users/${internalUserId}/sessions/revoke`,
    { method: "POST", body: { reason } },
  );
}

import { apiRequest } from "@/shared/api/client";
import type {
  PaginatedResponse,
  PaginationMeta,
  QueryParams,
} from "@/shared/api/types";
import type {
  AudienceSegment,
  CampaignMessage,
  NotificationCampaign,
} from "./types";

/**
 * Las campañas se crean, editan y programan en el ERP. Aquí sólo hay lectura y las tres palancas
 * de freno (pausar, reanudar, cancelar): ninguna función de este archivo crea ni cambia contenido.
 */
const BASE = "/operations/notifications/campaigns";

type BackendPage<T> = { data: T[]; pagination: PaginationMeta };

function toPaginated<T>(response: BackendPage<T>): PaginatedResponse<T> {
  return { items: response.data, meta: response.pagination };
}

export async function listCampaigns(
  query: QueryParams,
): Promise<PaginatedResponse<NotificationCampaign>> {
  return toPaginated(
    await apiRequest<BackendPage<NotificationCampaign>>(BASE, { query }),
  );
}

export function getCampaign(campaignId: string) {
  return apiRequest<NotificationCampaign>(`${BASE}/${campaignId}`);
}

export async function listCampaignMessages(
  campaignId: string,
  query: QueryParams,
): Promise<PaginatedResponse<CampaignMessage>> {
  return toPaginated(
    await apiRequest<BackendPage<CampaignMessage>>(
      `${BASE}/${campaignId}/messages`,
      { query },
    ),
  );
}

export function pauseCampaign(campaignId: string) {
  return apiRequest<NotificationCampaign>(`${BASE}/${campaignId}/pause`, {
    method: "POST",
  });
}

export function resumeCampaign(campaignId: string) {
  return apiRequest<NotificationCampaign>(`${BASE}/${campaignId}/resume`, {
    method: "POST",
  });
}

/** El servidor exige un motivo de 8 a 400 caracteres y anula los avisos que aún no salieron. */
export function cancelCampaign(campaignId: string, reason: string) {
  return apiRequest<NotificationCampaign>(`${BASE}/${campaignId}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

export async function listAudienceSegments(
  status: "active" | "archived",
): Promise<AudienceSegment[]> {
  const response = await apiRequest<{ data: AudienceSegment[] }>(
    "/operations/notifications/audience-segments",
    { query: { status } },
  );
  return response.data;
}

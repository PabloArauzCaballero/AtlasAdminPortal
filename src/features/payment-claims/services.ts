import { apiRequest } from "@/shared/api/client";
import type {
  PaymentClaimsApiResponse,
  PaymentClaimsFilters,
  PaymentClaimsPage,
} from "./types";

export const PAYMENT_CLAIMS_PAGE_SIZE = 25;

/**
 * La cola de avisos del tenant. Sólo lectura: la verificación es del comercio, en el ERP.
 *
 * El backend pagina con `pageSize` y `DataTable` espera `limit`; se traduce aquí para que la tabla
 * no tenga que saber de este contrato.
 */
export async function listPaymentClaims(
  filters: PaymentClaimsFilters,
): Promise<PaymentClaimsPage> {
  const response = await apiRequest<PaymentClaimsApiResponse>(
    "/operations/payment-claims",
    {
      query: {
        status: filters.status,
        partnerId: filters.partnerId.trim(),
        customerId: filters.customerId.trim(),
        olderThanHours: filters.olderThanHours,
        page: filters.page,
        pageSize: PAYMENT_CLAIMS_PAGE_SIZE,
      },
    },
  );
  return {
    items: response.items,
    summary: response.summary,
    meta: {
      page: response.meta.page,
      limit: response.meta.pageSize,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    },
  };
}

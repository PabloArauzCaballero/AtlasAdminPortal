import { apiRequest } from "@/shared/api/client";
import type {
  StagingDecisionBatchInput,
  StagingDecisionResult,
  StagingItemPage,
  StagingItemQuery,
} from "./catalog-staging-types";

export async function listStagingItems(
  query: StagingItemQuery,
): Promise<StagingItemPage> {
  const response = await apiRequest<Partial<StagingItemPage>>(
    "/operations/catalog-staging-items",
    { query },
  );
  return {
    items: response.items ?? [],
    total: response.total ?? 0,
    page: response.page ?? query.page,
    pageSize: response.pageSize ?? query.pageSize,
  };
}

/**
 * Decide un lote en una sola transacción: o se aplican todas las decisiones o ninguna. Exige
 * `x-idempotency-key`; la genera quien llama UNA vez por intento, para que reintentar el mismo
 * envío no cree dos veces los ítems aprobados.
 */
export function decideStagingItems(
  body: StagingDecisionBatchInput,
  idempotencyKey: string,
) {
  return apiRequest<StagingDecisionResult>(
    "/operations/catalog-staging-items/decision-batch",
    {
      method: "POST",
      body,
      headers: { "x-idempotency-key": idempotencyKey },
    },
  );
}

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
  const total = response.total ?? 0;
  const pageSize = response.pageSize ?? query.limit;
  return {
    items: response.items ?? [],
    total,
    page: response.page ?? query.page,
    pageSize,
    // Un servidor anterior no manda `meta`: se arma con lo que sí manda, para que la tabla pagine.
    meta: response.meta ?? {
      page: response.page ?? query.page,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    ...(response.summary ? { summary: response.summary } : {}),
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

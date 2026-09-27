import { apiRequest } from "@/shared/api/client";
import type {
  BusinessAcceptanceBody,
  BusinessAcceptanceResult,
  ChangeProductStatusBody,
  ChangeProductStatusResult,
  CreateCreditProductBody,
  CreateCreditProductResult,
  CreditApplicationDetail,
  CreditDecisionBody,
  CreditDecisionResult,
  CreditLine,
  CreditProductList,
  CustomerCreditApplications,
} from "./types";

/*
 * Ninguna de estas rutas pide `x-idempotency-key`, y por eso no se manda: el backend no la lee y
 * mandarla haría creer que repetir la petición es seguro. Lo que protege de la doble decisión es el
 * propio servidor (`409 CREDIT_APPLICATION_ALREADY_DECIDED`, `…_NOT_PENDING`).
 */

const OPS = "/operations/credit";

export function listCreditProducts() {
  return apiRequest<CreditProductList>(`${OPS}/products`);
}

export function createCreditProduct(body: CreateCreditProductBody) {
  return apiRequest<CreateCreditProductResult>(`${OPS}/products`, {
    method: "POST",
    body,
  });
}

export function changeCreditProductStatus(
  productId: string,
  body: ChangeProductStatusBody,
) {
  return apiRequest<ChangeProductStatusResult>(
    `${OPS}/products/${encodeURIComponent(productId)}/status`,
    { method: "PATCH", body },
  );
}

export function getCreditApplication(applicationId: string) {
  return apiRequest<CreditApplicationDetail>(
    `${OPS}/applications/${encodeURIComponent(applicationId)}`,
  );
}

export function decideCreditApplication(
  applicationId: string,
  body: CreditDecisionBody,
) {
  return apiRequest<CreditDecisionResult>(
    `${OPS}/applications/${encodeURIComponent(applicationId)}/decision`,
    { method: "POST", body },
  );
}

export function decideBusinessAcceptance(
  applicationId: string,
  body: BusinessAcceptanceBody,
) {
  return apiRequest<BusinessAcceptanceResult>(
    `${OPS}/applications/${encodeURIComponent(applicationId)}/business-acceptance`,
    { method: "POST", body },
  );
}

export function recalculateCreditLine(customerId: string) {
  return apiRequest<CreditLine>(
    `${OPS}/customers/${encodeURIComponent(customerId)}/credit-line/recalculate`,
    { method: "POST" },
  );
}

export function getCustomerCreditLine(customerId: string) {
  return apiRequest<CreditLine>(
    `/customers/${encodeURIComponent(customerId)}/credit-line`,
  );
}

export function listCustomerCreditApplications(customerId: string) {
  return apiRequest<CustomerCreditApplications>(
    `/customers/${encodeURIComponent(customerId)}/credit-applications`,
  );
}

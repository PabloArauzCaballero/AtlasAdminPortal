import type { EndpointItem } from "@/features/systems/types";

/**
 * Endpoint catalogado mínimo pero completo: los componentes del QA Lab leen
 * banderas de seguridad (`isDestructive`, `requiresAuth`, `containsPii`…) para
 * decidir qué guardas pintan, así que el fixture las trae todas explícitas y
 * cada test sobreescribe solo la que está probando.
 */
export function endpointFixture(
  overrides: Partial<EndpointItem> = {},
): EndpointItem {
  return {
    endpointId: "ep-1",
    code: "GET_HEALTH",
    module: "platform",
    controllerName: "HealthController",
    handlerName: "check",
    method: "GET",
    routePath: "/health",
    fullPath: "/api/v1/health",
    routeName: null,
    businessPurpose: null,
    businessAction: null,
    expectedResponseSummary: null,
    expectedStatusCodes: [200],
    minPayloadSchema: null,
    queryParamsSchema: null,
    pathParamsSchema: null,
    headersSchema: null,
    requiresAuth: false,
    allowedRoles: [],
    containsPii: false,
    piiFields: [],
    riskLevel: "LOW",
    isDestructive: false,
    isReadonly: true,
    idempotencyRequired: false,
    requiresStressTest: false,
    requiresIntegrationTest: false,
    isTestableFromPortal: true,
    testEnvironmentOnly: false,
    ownerTeam: null,
    status: "ACTIVE",
    version: null,
    detectedFrom: null,
    confidenceLevel: null,
    reviewStatus: "APPROVED",
    sourceFile: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

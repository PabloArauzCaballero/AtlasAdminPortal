import type { EndpointItem } from "@/features/systems/types";
import { getQaMockProvidersBaseUrl } from "./base-routes";

/**
 * Catálogo de los 9 endpoints de negocio de `AtlasExternalProvidersMock` (8 proveedores, uno con
 * dos operaciones), como `EndpointItem` sintéticos para que el QA Lab los pueda elegir igual que
 * cualquier endpoint real del catálogo de AtlasBackend.
 *
 * Rutas, métodos y dominios verificados contra el catálogo que el propio emulador publica
 * (`GET /mock/providers`, corrida real 2026-09-22 con el servidor levantado localmente) — no son
 * inventados. Los payloads de ejemplo usan los nombres de campo que
 * `AtlasExternalProvidersMock/src/domain/derive.mjs` (`identityOf`, `requestedAmount`,
 * `requestedCurrency`, `requestedReference`) efectivamente lee para derivar una respuesta estable
 * por persona; los valores en sí son sintéticos y se marcan como tales (QA-...).
 *
 * `fullPath`/`routePath` son la URL ABSOLUTA del mock (`getQaMockProvidersBaseUrl()` +
 * `/segip/identity/verify`, no un path relativo). Es deliberado: `buildUrl()` en
 * `request-builder.ts` reconoce una URL absoluta y la usa tal cual, sin pasar por la ruta base que
 * el operador haya elegido en el formulario — así un journey puede encadenar un paso contra
 * AtlasBackend con `baseRouteKey: "ENVIRONMENT_DEFAULT"` y el siguiente contra este endpoint del
 * mock EN LA MISMA CORRIDA, sin que la ruta base (que hoy es una sola por journey) tenga que
 * elegir entre uno u otro. Sigue siendo configurable por `NEXT_PUBLIC_QA_MOCK_BASE_URL`: se lee al
 * construir este catálogo, no se hardcodea `localhost:4010`.
 */
export const MOCK_ENDPOINT_ID_PREFIX = "mock:";

export function isMockEndpointId(endpointId: string): boolean {
  return endpointId.startsWith(MOCK_ENDPOINT_ID_PREFIX);
}

type MockEndpointSeed = {
  id: string;
  code: string;
  module: string;
  businessAction: string;
  businessPurpose: string;
  method: string;
  path: string;
  examplePayload: Record<string, unknown>;
};

const MOCK_ENDPOINT_SEEDS: MockEndpointSeed[] = [
  {
    id: "segip-identity-verify",
    code: "MOCK_SEGIP_IDENTITY_VERIFY",
    module: "Proveedores externos (mock)",
    businessAction: "Verificar identidad (SEGIP)",
    businessPurpose:
      "Registro estatal de identidad boliviano. Confirma que la cédula existe y que los datos coinciden.",
    method: "POST",
    path: "/segip/identity/verify",
    examplePayload: { input: { documentNumber: "QA-00000001" } },
  },
  {
    id: "infocenter-credit-report",
    code: "MOCK_INFOCENTER_CREDIT_REPORT",
    module: "Proveedores externos (mock)",
    businessAction: "Pedir reporte crediticio (INFOCENTER)",
    businessPurpose:
      "Central de riesgo crediticio. Devuelve score, deudas vigentes y peor mora de los últimos 12 meses.",
    method: "POST",
    path: "/infocenter/credit-report",
    examplePayload: { input: { documentNumber: "QA-00000001" } },
  },
  {
    id: "qr-payment-verify",
    code: "MOCK_QR_PAYMENT_VERIFY",
    module: "Proveedores externos (mock)",
    businessAction: "Verificar pago QR (QR_GENERIC)",
    businessPurpose:
      "Confirma que un cobro por QR se acreditó, con el monto y la referencia.",
    method: "POST",
    path: "/qr/payment/verify",
    examplePayload: {
      input: { reference: "QA-REF-0001", amount: 150.5, currency: "BOB" },
    },
  },
  {
    id: "banking-qr-generate",
    code: "MOCK_BANKING_QR_GENERATE",
    module: "Proveedores externos (mock)",
    businessAction: "Generar QR de cobro (BANKING_GENERIC)",
    businessPurpose: "Genera un QR de cobro para un monto y referencia dados.",
    method: "POST",
    path: "/banking/qr/generate",
    examplePayload: {
      input: { amount: 150.5, currency: "BOB", reference: "QA-REF-0001" },
    },
  },
  {
    id: "banking-transfer-verify",
    code: "MOCK_BANKING_TRANSFER_VERIFY",
    module: "Proveedores externos (mock)",
    businessAction: "Verificar transferencia (BANKING_GENERIC)",
    businessPurpose:
      "Confirma que una transferencia bancaria se realizó, con monto y referencia.",
    method: "POST",
    path: "/banking/transfer/verify",
    examplePayload: {
      input: { reference: "QA-REF-0001", amount: 150.5, currency: "BOB" },
    },
  },
  {
    id: "telco-phone-trust-check",
    code: "MOCK_TELCO_PHONE_TRUST_CHECK",
    module: "Proveedores externos (mock)",
    businessAction: "Chequear confianza del teléfono (TELCO_GENERIC)",
    businessPurpose:
      "Da antigüedad y señales de riesgo de un número de teléfono.",
    method: "POST",
    path: "/telco/phone-trust/check",
    examplePayload: { input: { phoneNumber: "+59170000001" } },
  },
  {
    id: "facebook-me",
    code: "MOCK_FACEBOOK_ME",
    module: "Proveedores externos (mock)",
    businessAction: "Leer perfil OAuth (FACEBOOK_META)",
    businessPurpose:
      "Simula el intercambio OAuth de Meta para verificación social.",
    method: "POST",
    path: "/facebook/me",
    examplePayload: { input: { email: "qa.lab@atlas.test" } },
  },
  {
    id: "whatsapp-verification-confirm",
    code: "MOCK_WHATSAPP_VERIFICATION_CONFIRM",
    module: "Proveedores externos (mock)",
    businessAction: "Confirmar verificación (WHATSAPP_GENERIC)",
    businessPurpose: "Confirma que un número de WhatsApp es contactable.",
    method: "POST",
    path: "/whatsapp/verification/confirm",
    examplePayload: { input: { phoneNumber: "+59170000001" } },
  },
  {
    id: "digital-trust-check",
    code: "MOCK_DIGITAL_TRUST_CHECK",
    module: "Proveedores externos (mock)",
    businessAction: "Chequear confianza digital (DIGITAL_TRUST_GENERIC)",
    businessPurpose:
      "Da una señal agregada de confianza digital de la persona.",
    method: "POST",
    path: "/digital-trust/check",
    examplePayload: { input: { documentNumber: "QA-00000001" } },
  },
];

function toEndpointItem(seed: MockEndpointSeed): EndpointItem {
  const endpointId = `${MOCK_ENDPOINT_ID_PREFIX}${seed.id}`;
  const absolutePath = `${getQaMockProvidersBaseUrl()}${seed.path}`;
  return {
    endpointId,
    code: seed.code,
    module: seed.module,
    systemCode: "MOCK_PROVIDERS",
    backendService: "atlas-external-providers-mock",
    backendBaseUrl: getQaMockProvidersBaseUrl(),
    controllerName: "MockProvidersEmulator",
    handlerName: seed.id,
    method: seed.method,
    routePath: absolutePath,
    fullPath: absolutePath,
    routeName: null,
    businessPurpose: seed.businessPurpose,
    businessAction: seed.businessAction,
    expectedResponseSummary:
      "Respuesta simulada del proveedor externo según el escenario pedido (x-mock-scenario).",
    expectedStatusCodes: [200],
    minPayloadSchema: seed.examplePayload,
    queryParamsSchema: {},
    pathParamsSchema: {},
    headersSchema: {},
    requiresAuth: false,
    allowedRoles: [],
    containsPii: true,
    piiFields: Object.keys(
      (seed.examplePayload.input as Record<string, unknown>) ?? {},
    ),
    riskLevel: "LOW",
    isDestructive: false,
    isReadonly: false,
    idempotencyRequired: true,
    requiresStressTest: true,
    requiresIntegrationTest: false,
    isTestableFromPortal: true,
    testEnvironmentOnly: true,
    ownerTeam: null,
    status: "ACTIVE",
    version: null,
    detectedFrom: "AtlasExternalProvidersMock/src/providers",
    confidenceLevel: null,
    reviewStatus: "REVIEWED",
    sourceFile: null,
    createdAt: null,
    updatedAt: null,
  };
}

export const MOCK_PROVIDER_ENDPOINTS: EndpointItem[] =
  MOCK_ENDPOINT_SEEDS.map(toEndpointItem);

const MOCK_PROVIDER_ENDPOINTS_BY_ID = new Map(
  MOCK_PROVIDER_ENDPOINTS.map((endpoint) => [endpoint.endpointId, endpoint]),
);

const MOCK_EXAMPLE_PAYLOAD_BY_ID = new Map(
  MOCK_ENDPOINT_SEEDS.map((seed) => [
    `${MOCK_ENDPOINT_ID_PREFIX}${seed.id}`,
    seed.examplePayload,
  ]),
);

export function getMockProviderEndpoint(
  endpointId: string,
): EndpointItem | undefined {
  return MOCK_PROVIDER_ENDPOINTS_BY_ID.get(endpointId);
}

/**
 * El payload de ejemplo REAL (`{"input": {...}}`), para usar directo en el formulario.
 *
 * No se guarda como `minPayloadSchema` del `EndpointItem` porque ese campo lo lee
 * `contract-fields.ts` como un contrato plano `{campo: "tipo|required"}` (`readContract`/
 * `sampleFrom` en `endpoint-test-card.tsx` y `stress-test-card.tsx`), no como un payload literal:
 * meter el objeto ahí se sintetizaría mal. Esta función es el atajo directo para los formularios
 * de QA Lab, análogo a `findPayloadPreset` pero indexado por `endpointId` en vez de por
 * método+ruta (los 9 mock terminan en una URL absoluta, que el matcher de `payload-presets.ts`
 * no reconoce como ruta relativa).
 */
export function getMockExamplePayload(
  endpointId: string,
): Record<string, unknown> | undefined {
  return MOCK_EXAMPLE_PAYLOAD_BY_ID.get(endpointId);
}

/** Filtro simple en memoria: son 9 endpoints, no justifica una query. */
export function searchMockProviderEndpoints(query: string): EndpointItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return MOCK_PROVIDER_ENDPOINTS;
  return MOCK_PROVIDER_ENDPOINTS.filter((endpoint) =>
    [endpoint.fullPath, endpoint.businessAction, endpoint.code, endpoint.module]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(q)),
  );
}

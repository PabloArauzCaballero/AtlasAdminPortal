/**
 * Payloads de ejemplo reales para QA Lab, distintos del `minPayloadSchema`
 * catalogado (que para la mayoría de endpoints solo trae
 * `{ schemaReference: "nombreDelSchema" }` — un puntero al Zod schema en el
 * backend, no un payload ejecutable). Cada preset aquí se construyó leyendo
 * el Zod schema real del endpoint en AtlasBackend, con valores válidos que
 * pasan sus propias reglas (min/max/regex/enum), para que "Usar payload de
 * ejemplo" produzca un request que de verdad se pueda ejecutar sin editar
 * nada primero.
 */
export type QaPayloadPreset = {
  method: string;
  pathPattern: string;
  label: string;
  payload?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  notes: string;
};

export const QA_PAYLOAD_PRESETS: QaPayloadPreset[] = [
  {
    method: "POST",
    pathPattern: "/auth/login",
    label: "Login de cliente demo",
    payload: {
      actorType: "customer",
      identifier: "cliente.demo@atlas.test",
      password: "Atlas_Demo#2026!",
    },
    notes:
      "actorType admite customer/internal_user/platform_user; identifier es teléfono o email para customer.",
  },
  {
    method: "POST",
    pathPattern: "/auth/refresh",
    label: "Refrescar sesión",
    payload: { refreshToken: "{{refreshToken}}" },
    notes:
      "Sustituye {{refreshToken}} por un token real extraído de un login previo (Journey Runner).",
  },
  {
    method: "POST",
    pathPattern: "/customer-onboarding/start",
    label: "Iniciar onboarding completo",
    payload: {
      customer: {
        phone: "+59171234567",
        email: "nuevo.cliente@atlas.test",
        firstName: "Nuevo",
        lastName: "Cliente",
        birthDate: "1996-05-14",
      },
      password: "ClienteDemo#2026!",
      consents: [
        {
          consentDocumentId: "1",
          purposeCode: "risk_fraud_assessment",
          granted: true,
          acceptedAt: "2026-07-11T00:00:00.000Z",
        },
      ],
      device: {
        deviceFingerprintHash:
          "qa-lab-example-fingerprint-hash-0000000000000001",
        fingerprintVersion: "v1",
        channel: "mobile_app",
        userAgent: "AtlasQA/1.0 (Android 14)",
        snapshot: {
          brand: "Samsung",
          model: "Galaxy A54",
          osFamily: "Android",
          osVersion: "14",
          appVersion: "1.0.0",
          isRooted: false,
          isEmulator: false,
          vpnDetected: false,
          timezone: "America/La_Paz",
          locale: "es-BO",
        },
      },
      permissions: [
        { permissionCode: "location", granted: true },
        { permissionCode: "camera", granted: true },
      ],
      onboarding: { sourceType: "mobile_app" },
    },
    notes:
      "consentDocumentId debe existir en consent_documents del tenant; ajusta el ID si tu seed local difiere.",
  },
  {
    method: "POST",
    pathPattern: "/customer-onboarding/:customerId/address-package",
    label: "Registrar dirección + GPS",
    pathParams: { customerId: "1" },
    payload: {
      address: {
        countryCode: "BOL",
        department: "Santa Cruz",
        city: "Santa Cruz de la Sierra",
        zone: "Equipetrol",
      },
      gpsObservation: {
        lat: -17.7833,
        lng: -63.1821,
        accuracyMeters: 15,
        capturedAt: "2026-07-11T00:00:00.000Z",
      },
    },
    notes:
      "gpsObservation es opcional; sin ella solo se registra la dirección declarada.",
  },
  {
    method: "POST",
    pathPattern:
      "/customer-onboarding/:customerId/contact-verification/request",
    label: "Solicitar código de verificación",
    pathParams: { customerId: "1" },
    payload: { contactType: "phone", verificationChannel: "sms" },
    notes:
      "Combina con el paso 'submit' en un Journey para probar el flujo completo.",
  },
  {
    method: "POST",
    pathPattern: "/customer-onboarding/:customerId/contact-verification/submit",
    label: "Confirmar código de verificación",
    pathParams: { customerId: "1" },
    payload: {
      contactType: "phone",
      verificationChannel: "sms",
      verificationCode: "123456",
    },
    notes:
      "verificationCode es de 4 a 12 caracteres; en dry-run no valida contra un código real enviado.",
  },
  {
    method: "GET",
    pathPattern: "/operations/work-queue",
    label: "Cola de trabajo (revisión manual)",
    queryParams: {
      queue: "manual_review",
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    notes: "queue admite manual_review, fraud o all.",
  },
  {
    method: "PATCH",
    pathPattern: "/operations/manual-review-cases/:caseId/decision",
    label: "Decidir caso de revisión manual",
    pathParams: { caseId: "1" },
    payload: {
      decision: "approved",
      reasonCode: "documents_verified",
      notes: "Documentación verificada manualmente por QA.",
      nextCustomerStatus: "approved_for_next_step",
    },
    notes:
      "decision admite approved/rejected/request_more_information/escalated_to_fraud/no_action.",
  },
  {
    method: "GET",
    pathPattern: "/customers/:customerId/me",
    label: "Ficha mínima del cliente autenticado",
    pathParams: { customerId: "1" },
    notes:
      "Solo lectura; requiere que el token de sesión corresponda al mismo customerId (o rol interno).",
  },
];

function normalizePath(path: string): string {
  return path
    .split("?")[0]
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/^api\/v[0-9]+\//, "");
}

function matchesPattern(pattern: string, path: string): boolean {
  const patternSegments = normalizePath(pattern).split("/");
  const pathSegments = normalizePath(path).split("/");
  if (patternSegments.length !== pathSegments.length) return false;
  return patternSegments.every(
    (segment, index) =>
      segment.startsWith(":") || segment === pathSegments[index],
  );
}

export function findPayloadPreset(
  method: string,
  fullPath?: string | null,
): QaPayloadPreset | undefined {
  if (!fullPath) return undefined;
  return QA_PAYLOAD_PRESETS.find(
    (preset) =>
      preset.method === method.toUpperCase() &&
      matchesPattern(preset.pathPattern, fullPath),
  );
}

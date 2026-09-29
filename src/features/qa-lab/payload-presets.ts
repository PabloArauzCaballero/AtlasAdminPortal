/**
 * Ejemplos de datos de entrada por operación, contrastados con el Zod REAL de AtlasBackend (no con
 * el contrato del catálogo, que para varias rutas está desactualizado: el login del catálogo dice
 * `email/password` y el Zod pide `actorType/identifier/password`).
 *
 * Son PLANTILLAS: ningún dato de persona va escrito aquí. Los marcadores `{{faker.caso.…}}` y
 * `{{faker.monto.…}}` se resuelven contra el caso que el generador devuelve para la semilla
 * elegida, y `{{qa.pin}}` / `{{qa.now}}` son valores locales (un PIN aceptable y la hora actual).
 * Ver `fakers/faker-template.ts`.
 *
 * Los identificadores de ruta (`customerId`, `caseId`) van VACÍOS a propósito: tienen que ser de
 * un registro que exista en el entorno, y un «1» inventado sólo producía un 404 engañoso. Vacíos,
 * el Lab se niega a enviar y dice qué dato falta.
 */
export type QaPayloadPreset = {
  method: string;
  pathPattern: string;
  label: string;
  payload?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  /** Códigos que dan la prueba por buena CON ESTE EJEMPLO (p. ej. 401 en un login inventado). */
  expectedStatusCodes?: string;
  notes: string;
};

const CUSTOMER_PARAM_NOTE =
  "Escribe en «Datos de la ruta» el número de un cliente que exista en el entorno (lo devuelve «Iniciar alta de cliente»).";

export const QA_PAYLOAD_PRESETS: QaPayloadPreset[] = [
  {
    method: "POST",
    pathPattern: "/auth/login",
    label: "Entrar como cliente (credenciales generadas)",
    payload: {
      actorType: "customer",
      identifier: "{{faker.caso.persona.email}}",
      password: "{{qa.pin}}",
    },
    expectedStatusCodes: "401",
    notes:
      "El correo y el PIN son generados, así que esa cuenta no existe: lo correcto es 401 (credenciales inválidas). Para entrar de verdad cambia el correo y el PIN por los de una cuenta que exista en el entorno; no hay ninguna cuenta de cliente de demostración cargada de antemano.",
  },
  {
    method: "POST",
    pathPattern: "/customer-onboarding/start",
    label: "Iniciar alta de cliente",
    payload: {
      customer: {
        phone: "{{faker.caso.persona.phone}}",
        email: "{{faker.caso.persona.email}}",
        firstName: "{{faker.caso.persona.firstName}}",
        lastName: "{{faker.caso.persona.lastName}}",
        birthDate: "{{faker.caso.persona.birthDate}}",
      },
      password: "{{qa.pin}}",
      consents: [
        {
          consentDocumentId: "1",
          purposeCode: "risk_fraud_assessment",
          granted: true,
          acceptedAt: "{{qa.now}}",
        },
      ],
      device: {
        deviceFingerprintHash:
          "{{faker.caso.dispositivo.deviceFingerprintHash}}",
        fingerprintVersion: "{{faker.caso.dispositivo.fingerprintVersion}}",
        channel: "{{faker.caso.dispositivo.channel}}",
        userAgent: "{{faker.caso.dispositivo.userAgent}}",
        snapshot: "{{faker.caso.dispositivo.snapshot}}",
      },
      permissions: [
        { permissionCode: "location", granted: true },
        { permissionCode: "camera", granted: true },
      ],
      onboarding: { sourceType: "mobile_app" },
    },
    expectedStatusCodes: "200, 201",
    notes:
      "Crea un cliente: con una semilla con nombre la segunda vez responderá que ya existe; usa «Personas nuevas». El PIN es de 4 dígitos (así lo pide el alta). El campo consentDocumentId tiene que ser un documento de consentimiento vigente del entorno; si responde que no existe, cámbialo.",
  },
  {
    method: "POST",
    pathPattern: "/customer-onboarding/:customerId/address-package",
    label: "Registrar dirección y ubicación",
    pathParams: { customerId: "" },
    payload: {
      address: {
        countryCode: "BOL",
        department: "{{faker.caso.direccion.department}}",
        city: "{{faker.caso.direccion.city}}",
        zone: "{{faker.caso.direccion.zone}}",
        addressLine: "{{faker.caso.persona.address}}",
      },
      gpsObservation: {
        lat: "{{faker.caso.direccion.latitude}}",
        lng: "{{faker.caso.direccion.longitude}}",
        accuracyMeters: 15,
        capturedAt: "{{qa.now}}",
      },
    },
    notes: `La ubicación es opcional; sin ella sólo se registra la dirección declarada. ${CUSTOMER_PARAM_NOTE}`,
  },
  {
    method: "POST",
    pathPattern:
      "/customer-onboarding/:customerId/contact-verification/request",
    label: "Pedir código de verificación",
    pathParams: { customerId: "" },
    payload: { contactType: "phone", verificationChannel: "sms" },
    notes: `El teléfono admite sms o whatsapp; el correo, sólo email. ${CUSTOMER_PARAM_NOTE}`,
  },
  {
    method: "POST",
    pathPattern: "/customer-onboarding/:customerId/contact-verification/submit",
    label: "Confirmar código de verificación",
    pathParams: { customerId: "" },
    payload: {
      contactType: "phone",
      verificationChannel: "sms",
      verificationCode: "",
    },
    notes: `Escribe el código que llegó al teléfono del cliente (de 4 a 12 caracteres). Con un código inventado lo correcto es que lo rechace. ${CUSTOMER_PARAM_NOTE}`,
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
    notes:
      "La cola admite manual_review, fraud o all; como mucho 100 por página.",
  },
  {
    method: "POST",
    pathPattern: "/operations/manual-review-cases/:caseId/decision",
    label: "Decidir un caso de revisión manual",
    pathParams: { caseId: "" },
    payload: {
      decision: "approved",
      reasonCode: "documents_verified",
      notes: "Documentación verificada manualmente por QA.",
      nextCustomerStatus: "active",
    },
    notes:
      "Escribe en «Datos de la ruta» el número de un caso abierto de la cola de revisión. La decisión admite approved, rejected, request_more_information, escalated_to_fraud o no_action; al rechazar o pedir información, la nota es obligatoria.",
  },
  {
    method: "GET",
    pathPattern: "/customers/:customerId/me",
    label: "Ficha del cliente",
    pathParams: { customerId: "" },
    notes: `Sólo lectura. Con tu sesión interna necesitas un rol con acceso a clientes. ${CUSTOMER_PARAM_NOTE}`,
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

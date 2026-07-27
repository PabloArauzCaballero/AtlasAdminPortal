/**
 * Los endpoints y tablas solo exponen `module` (segmento de ruta o módulo del
 * modelo), mientras que el catálogo de dominios (system_domain_catalog) está
 * indexado por `domainCode`. Este mapa cruza ambos para poder resolver la
 * descripción oficial del dominio a partir de un módulo. Es el inverso de
 * `moduleFromTable()` del backend.
 */
export const DOMAIN_CODE_TO_MODULE: Record<string, string> = {
  PLATAFORMA: "platform",
  IDENTIDAD_KYC: "customers",
  PRIVACIDAD: "privacy",
  DISPOSITIVO: "device_intelligence",
  ONBOARDING: "onboarding",
  RIESGO_CREDITO: "risk",
  CAPACIDAD_PAGO: "risk",
  FRAUDE: "fraud",
  PROVEEDORES: "external_data",
  COMUNICACIONES: "notifications",
  CALIDAD_DATOS: "data_quality",
  AUDITORIA: "audit",
  SISTEMAS_QA: "systems",
};

/**
 * Los módulos llegan con guiones (entidades) o guiones bajos (endpoints); se
 * normaliza para que ambos caigan en la misma clave.
 */
export function normalizeModule(value?: string | null): string {
  return (value?.trim() || "sin_dominio").toLowerCase().replace(/-/g, "_");
}

/** Clave de módulo normalizada a la que corresponde un `domainCode`. */
export function moduleKeyForDomainCode(domainCode: string): string {
  return normalizeModule(DOMAIN_CODE_TO_MODULE[domainCode] ?? domainCode);
}

/**
 * Descripción de respaldo por módulo. El catálogo de dominios del backend
 * (system_domain_catalog) no cubre todos los módulos que reportan endpoints y
 * tablas (p. ej. `operations`, `admin`, `auth`), así que la vista de dominios
 * caía en "Sin descripción registrada". Estas descripciones —redactadas según
 * lo que cada módulo hace en el portal— rellenan ese hueco. La descripción del
 * catálogo del backend, cuando existe, siempre tiene prioridad sobre esta.
 *
 * Clave = módulo normalizado (`normalizeModule`).
 */
export const MODULE_DESCRIPTIONS: Record<string, string> = {
  operations:
    "Operación interna del negocio: casos, sesiones de trabajo, colas de revisión y flujos operativos del día a día.",
  admin:
    "Administración de la plataforma: usuarios internos, roles, permisos y configuración del portal.",
  auth: "Autenticación y sesión: inicio de sesión interno, tokens, refresh y control de acceso.",
  catalog_management:
    "Gestión del catálogo operativo: versiones, publicación y ciclo de vida de los catálogos que consume el negocio.",
  customers:
    "Clientes: perfil versionado, documentos, intentos KYC, contactos, direcciones y evidencias de identidad.",
  external_data:
    "Proveedores externos y enriquecimiento: KYC, buró, reputación IP, telco, OCR, QR/bancos y otras integraciones.",
  platform:
    "Plataforma base: servicios transversales, configuración compartida y utilidades del sistema.",
  privacy:
    "Privacidad y datos personales: registro de PII, consentimientos y minimización de datos.",
  device_intelligence:
    "Inteligencia de dispositivo: huellas, señales de riesgo y reputación del dispositivo.",
  onboarding: "Onboarding: alta y activación de clientes de punta a punta.",
  risk: "Riesgo: evaluación crediticia, capacidad de pago y políticas de decisión.",
  fraud: "Fraude: detección, señales y reglas antifraude.",
  notifications:
    "Comunicaciones: notificaciones, broadcasts y plantillas de mensajería.",
  data_quality: "Calidad de datos: reglas, incidencias y remediación.",
  audit: "Auditoría: trazabilidad de eventos y acciones sobre el sistema.",
  systems:
    "Systems Ops y QA: catálogo de endpoints, herramientas internas y laboratorio de pruebas.",
  governance:
    "Gobierno de datos: políticas, dominios, responsables y estándares.",
  lineage:
    "Linaje de datos: relaciones y trazabilidad entre orígenes y destinos.",
  reports: "Reportes: tableros de negocio y readiness de release.",
  security: "Seguridad: revisiones, controles y hallazgos de seguridad.",
};

/**
 * Descripción para un módulo cuando el catálogo del backend no la trae.
 * Devuelve `undefined` si el módulo tampoco está en el mapa de respaldo, para
 * que la UI decida el texto final.
 */
export function moduleDescription(module?: string | null): string | undefined {
  return MODULE_DESCRIPTIONS[normalizeModule(module)];
}

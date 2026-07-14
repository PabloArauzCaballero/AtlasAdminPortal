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

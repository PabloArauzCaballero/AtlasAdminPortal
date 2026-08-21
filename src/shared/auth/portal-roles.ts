/**
 * Los roles con los que AtlasBackend autoriza REALMENTE el portal operacional.
 *
 * `InternalPortalController` y `RuntimeJobsController` se guardan con `@Roles(...)`, no con
 * permisos granulares: el catálogo RBAC no publica `internal.alerts.read`, `internal.exports.read`
 * ni `internal.jobs.read`. Mientras esas pantallas se filtraban por esos permisos inventados, la
 * condición era imposible de cumplir y "Alertas", "Exportaciones", "Jobs" y "Jobs de runtime"
 * mostraban "Acceso restringido" a TODO el mundo —superadministrador incluido— sobre endpoints que
 * contestaban 200. Espejar aquí la lista del backend es lo que hace que el gate diga la verdad.
 *
 * Si el backend cambia sus `@Roles(...)`, esta lista cambia con él: no es una política propia del
 * front, es una copia declarada de la suya.
 */
export const INTERNAL_PORTAL_ROLES = [
  "internal_operator",
  "risk_analyst",
  "compliance_analyst",
  "admin",
  "platform_admin",
  "system_admin",
  "qa_engineer",
  "devops",
  "readonly_auditor",
] as const;

/** `RuntimeJobsController`: disparar un job de mantenimiento es más restringido que leerlo. */
export const RUNTIME_JOB_ROLES = ["admin", "platform_admin", "system"] as const;

export const INTERNAL_PORTAL_ROLE_LIST: string[] = [...INTERNAL_PORTAL_ROLES];
export const RUNTIME_JOB_ROLE_LIST: string[] = [...RUNTIME_JOB_ROLES];

import type { InternalUserDepartment, InternalUserStatus } from "./types";

/**
 * El backend guarda departamento y estado como códigos (`OPERATIONS`, `suspended`); la pantalla los
 * enseñaba tal cual, en inglés y en mayúsculas, en la lista, la ficha y los desplegables. Aquí
 * vive la única traducción, para que las cuatro pantallas digan lo mismo.
 */
export const DEPARTMENT_LABELS: Record<InternalUserDepartment, string> = {
  OPERATIONS: "Operaciones",
  RISK: "Riesgo",
  COLLECTIONS: "Cobranzas",
  COMPLIANCE: "Cumplimiento",
  FINANCE: "Finanzas",
  SUPPORT: "Soporte",
  SYSTEMS: "Sistemas",
  AUDIT: "Auditoría",
  EXECUTIVE: "Dirección",
};

export const STATUS_LABELS: Record<InternalUserStatus, string> = {
  active: "Activa",
  invited: "Invitada",
  suspended: "Suspendida",
  locked: "Bloqueada",
  disabled: "Desactivada",
};

/** Un código que no está en la lista se enseña tal cual: mejor eso que ocultarlo. */
export function departmentLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return DEPARTMENT_LABELS[value as InternalUserDepartment] ?? value;
}

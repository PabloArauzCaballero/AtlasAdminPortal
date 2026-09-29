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

/**
 * Los estados de una cuenta interna para el filtro de «Usuarios internos». Catálogo fijo —el mismo
 * enum que valida el backend—, nunca sacado de las filas cargadas: así el filtro ofrece también el
 * estado que no aparece en la página que se está viendo.
 */
export const USER_STATUS_OPTIONS = [
  {
    value: "active",
    label: STATUS_LABELS.active,
    description: "Puede iniciar sesión y usar el portal con sus roles.",
  },
  {
    value: "invited",
    label: STATUS_LABELS.invited,
    description: "Se dio de alta pero todavía no entró por primera vez.",
  },
  {
    value: "suspended",
    label: STATUS_LABELS.suspended,
    description: "Acceso cortado temporalmente por un administrador, con motivo.",
  },
  {
    value: "locked",
    label: STATUS_LABELS.locked,
    description: "Bloqueada por un administrador; no es el bloqueo por intentos.",
  },
  {
    value: "disabled",
    label: STATUS_LABELS.disabled,
    description: "Dada de baja: ya no puede entrar y no recibe accesos.",
  },
];

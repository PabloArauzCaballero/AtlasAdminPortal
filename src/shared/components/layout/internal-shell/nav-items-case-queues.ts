import { ClipboardList, ShieldAlert } from "lucide-react";
import { OPERATIONS_CASE_ROLE_LIST } from "@/shared/auth/portal-roles";
import type { InternalNavItem } from "./nav-config";

const CASE_ROLES = OPERATIONS_CASE_ROLE_LIST;

/**
 * Las dos colas de casos por separado, paginadas por cursor, junto a la «Cola de trabajo» combinada.
 *
 * Viven en su propio fichero porque `nav-groups-secondary.ts` está en el tope de 300 líneas. Gate
 * por @Roles en el backend, igual que la cola combinada: no hay permiso granular en el catálogo.
 */
export const CASE_QUEUE_NAV_ITEMS: InternalNavItem[] = [
  {
    label: "Revisión manual",
    href: "/internal/operations/manual-review-cases",
    icon: ClipboardList,
    permissions: [],
    roles: CASE_ROLES,
  },
  {
    label: "Casos de fraude",
    href: "/internal/operations/fraud-cases",
    icon: ShieldAlert,
    // Verlos: cualquier rol de operación y fraud_analyst. Decidirlos: sólo fraude y admin.
    permissions: [],
    roles: [...CASE_ROLES, "fraud_analyst"],
  },
];

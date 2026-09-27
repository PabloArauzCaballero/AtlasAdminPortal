import { Landmark } from "lucide-react";
import type { InternalNavGroup } from "./nav-config";
import { CREDIT_OPERATIONS_ROLE_LIST } from "@/shared/auth/portal-roles";

/**
 * Crédito (proceso P-06), en su propio archivo porque `nav-groups-secondary.ts` está al tope de
 * líneas. Sólo el catálogo tiene entrada propia: una solicitud se abre desde la ficha del cliente
 * o desde su caso `CR-…` en la cola de trabajo, porque el backend no publica una lista general
 * de solicitudes.
 */
export const creditGroup: InternalNavGroup = {
  label: "Crédito",
  icon: Landmark,
  items: [
    {
      label: "Productos de crédito",
      href: "/internal/operations/credit/products",
      icon: Landmark,
      // `CreditOperationsController` gatea por @Roles, sin permiso granular (`credit.*` no existe
      // todavía en el catálogo RBAC): el ítem sigue la lista declarada de ese controlador.
      permissions: [],
      roles: CREDIT_OPERATIONS_ROLE_LIST,
    },
  ],
};

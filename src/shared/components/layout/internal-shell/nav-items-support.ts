import { BookOpenText, LifeBuoy, UserCog } from "lucide-react";
import type { InternalNavItem } from "./nav-config";
import {
  SUPPORT_ADMIN_ROLE_LIST,
  SUPPORT_KNOWLEDGE_ROLE_LIST,
} from "@/shared/auth/portal-roles";

/** Las entradas de la mesa de soporte dentro de «Operaciones». */
export const supportNavItems: InternalNavItem[] = [
  {
    label: "Soporte",
    href: "/internal/support",
    icon: LifeBuoy,
    // Mismo criterio que "Cola de trabajo": el backend gatea por @Roles y, además, exige un
    // perfil de agente vivo que no vive en el catálogo de permisos. Se deja visible porque un
    // ítem oculto no explica nada; la pantalla sí dice qué falta y dónde habilitarlo.
    permissions: [],
  },
  {
    label: "Base de conocimiento",
    href: "/internal/support/knowledge",
    icon: BookOpenText,
    // `SupportKnowledgeAdminController` gatea por @Roles, sin permiso granular en el catálogo.
    // No exige perfil de agente: redactar ayuda no es atender casos.
    permissions: [],
    roles: SUPPORT_KNOWLEDGE_ROLE_LIST,
  },
  {
    label: "Agentes de soporte",
    href: "/internal/support/agents",
    icon: UserCog,
    // Habilitar agentes decide quién puede leer expedientes de soporte —con la conversación
    // completa dentro—, así que el backend lo restringe a admin y platform_admin.
    permissions: [],
    roles: SUPPORT_ADMIN_ROLE_LIST,
  },
];

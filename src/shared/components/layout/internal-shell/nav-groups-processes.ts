import { Workflow } from "lucide-react";
import type { InternalNavGroup } from "./nav-config";

/**
 * El grupo Procesos, junto a Systems Ops y no dentro.
 *
 * Systems Ops habla de rutas, flujos y herramientas; Procesos habla del negocio —el alta de un
 * cliente, el crédito, el cobro— y lo abre gente de operaciones que no entra a Systems Ops. El
 * permiso es el mismo que exige `internal/processes` en el backend (`workflows.read`): el menú no
 * autoriza nada, pero si enseñara el ítem a quien el backend le va a contestar 403, la persona
 * llegaría a una pantalla de «acceso restringido».
 */
export const processesGroup: InternalNavGroup = {
  label: "Procesos",
  icon: Workflow,
  items: [
    {
      label: "Procesos",
      href: "/internal/procesos",
      icon: Workflow,
      permissions: ["workflows.read"],
    },
  ],
};

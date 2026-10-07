import type { InternalNavGroup } from "./nav-config";
import { navGroupOperations } from "./nav-groups-operations";
import { navGroupsPrimary } from "./nav-groups-primary";
import { navGroupsSecondary } from "./nav-groups-secondary";

// «Operaciones» va primero: es lo que se abre cada día. El resto se consulta o se configura.
export const navGroups: InternalNavGroup[] = [
  navGroupOperations,
  ...navGroupsPrimary,
  ...navGroupsSecondary,
];

import type { InternalNavGroup } from "./nav-config";
import { navGroupOperations } from "./nav-groups-operations";
import { navGroupsPrimary } from "./nav-groups-primary";
import { navGroupsSecondary } from "./nav-groups-secondary";

export const navGroups: InternalNavGroup[] = [
  ...navGroupsPrimary,
  navGroupOperations,
  ...navGroupsSecondary,
];

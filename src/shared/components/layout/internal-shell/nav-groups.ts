import type { InternalNavGroup } from "./nav-config";
import { creditGroup } from "./nav-groups-credit";
import { navGroupOperations } from "./nav-groups-operations";
import { navGroupsPrimary } from "./nav-groups-primary";
import { navGroupsSecondary } from "./nav-groups-secondary";

export const navGroups: InternalNavGroup[] = [
  ...navGroupsPrimary,
  creditGroup,
  navGroupOperations,
  ...navGroupsSecondary,
];

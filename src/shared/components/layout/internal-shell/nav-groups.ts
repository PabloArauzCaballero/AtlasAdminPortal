import type { InternalNavGroup } from "./nav-config";
import { dataGroup } from "./nav-groups-data";
import { governanceGroup } from "./nav-groups-governance";
import { navGroupOperations } from "./nav-groups-operations";
import { qaReportsGroup } from "./nav-groups-qa-reports";
import { navGroupsSecondary } from "./nav-groups-secondary";
import { systemsOpsGroup } from "./nav-groups-systems-ops";

const [externalProvidersGroup, administrationGroup] = navGroupsSecondary;

/*
 * Siete grupos y treinta y cinco entradas; eran trece y sesenta y cuatro (2026-10-07).
 * «Operaciones» va primero: es lo que se abre cada día. Lo demás, de lo que se consulta a lo que
 * se configura.
 */
export const navGroups: InternalNavGroup[] = [
  navGroupOperations,
  dataGroup,
  governanceGroup,
  externalProvidersGroup,
  systemsOpsGroup,
  qaReportsGroup,
  administrationGroup,
];

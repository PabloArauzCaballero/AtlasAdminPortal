import type { PaginatedResponse } from "@/shared/api/types";
import { normalizeForSearch } from "@/shared/lib/options";
import type { ProcessListItem } from "./types";

export type ProcessFilters = {
  q: string;
  processType: string;
  system: string;
  priority: string;
  status: string;
};

export const EMPTY_PROCESS_FILTERS: ProcessFilters = {
  q: "",
  processType: "",
  system: "",
  priority: "",
  status: "",
};

export const PROCESSES_PAGE_SIZE = 20;

function matchesStatus(item: ProcessListItem, status: string): boolean {
  switch (status) {
    case "documented":
      return item.documentation.complete;
    case "undocumented":
      return !item.documentation.complete;
    case "unwired":
      return item.wiring.unwired > 0;
    case "wired":
      return item.wiring.unwired === 0 && item.wiring.unknown === 0;
    default:
      return true;
  }
}

/**
 * Filtra y pagina en el navegador. El backend devuelve todos los procesos de una vez —son unas
 * decenas, declarados en código— así que pedir cada página por red sería más lento y no más
 * correcto.
 */
export function filterProcesses(
  items: readonly ProcessListItem[],
  filters: ProcessFilters,
  page: number,
  pageSize = PROCESSES_PAGE_SIZE,
): PaginatedResponse<ProcessListItem> {
  const q = normalizeForSearch(filters.q);
  const filtered = items.filter(
    (item) =>
      (!q ||
        normalizeForSearch(
          `${item.processId} ${item.code} ${item.name} ${item.description}`,
        ).includes(q)) &&
      (!filters.processType || item.processType === filters.processType) &&
      (!filters.system || item.systems.includes(filters.system)) &&
      (!filters.priority || item.priority === filters.priority) &&
      matchesStatus(item, filters.status),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: filtered.slice((current - 1) * pageSize, current * pageSize),
    meta: {
      page: current,
      limit: pageSize,
      total: filtered.length,
      totalPages,
    },
  };
}

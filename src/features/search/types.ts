import type { PaginationMeta } from "@/shared/api/types";

export type GlobalSearchResult = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  /** `null` si el backend devolvió un destino no navegable de forma segura. */
  href: string | null;
  status?: string | null;
  method?: string | null;
  riskLevel?: string | null;
  containsPii?: boolean | null;
};

export type GlobalSearchKind = "endpoint" | "table" | "quality_rule" | "report";

export type GlobalSearchResponse = {
  items: GlobalSearchResult[];
  totals?: Record<string, number>;
  /** Paginación del tipo pedido; `null` si el backend no la manda (versión anterior). */
  meta: PaginationMeta | null;
};

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

export type GlobalSearchResponse = {
  items: GlobalSearchResult[];
  totals?: Record<string, number>;
};

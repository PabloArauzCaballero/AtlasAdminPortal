export type GlobalSearchResult = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  href: string;
  status?: string | null;
  method?: string | null;
  riskLevel?: string | null;
  containsPii?: boolean | null;
};

export type GlobalSearchResponse = {
  items: GlobalSearchResult[];
  totals?: Record<string, number>;
};

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useReviewQueue } from "@/features/systems/hooks";
import type { ReviewQueueBucket } from "@/features/systems/types";
import {
  bucketOf,
  familyPage,
  REVIEW_PAGE_SIZE,
  type ReviewFamily,
} from "./review-families";
import { ReviewTableCard } from "./review-table-card";

export type ReviewFilters = {
  q: string;
  reviewStatus: string;
};

/**
 * Una familia pedida al servidor por su cuenta (`type=<familia>`), con su página, el texto de
 * búsqueda y el estado de revisión. El texto viaja al servidor: busca en las seis familias.
 */
export function ReviewFamilySection<T>({
  family,
  filters,
  columns,
}: Readonly<{
  family: ReviewFamily;
  filters: ReviewFilters;
  columns: ColumnDef<T>[];
}>) {
  const [pageState, setPageState] = useState({ page: 1, filters });
  // Cambiar el filtro vuelve a la página 1 sin un efecto que pinte antes la página vieja.
  const page = pageState.filters === filters ? pageState.page : 1;
  const query = useReviewQueue({
    type: family.type,
    page,
    limit: REVIEW_PAGE_SIZE,
    reviewStatus: filters.reviewStatus,
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
  });
  const { items, meta } = familyPage(
    bucketOf(query.data, family) as ReviewQueueBucket<T> | undefined,
    page,
  );
  return (
    <ReviewTableCard
      title={family.title}
      data={items}
      meta={meta}
      columns={columns}
      onPageChange={(next) => setPageState({ page: next, filters })}
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      filtered={Boolean(filters.q.trim())}
    />
  );
}

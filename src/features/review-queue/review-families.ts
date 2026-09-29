import type { PaginationMeta } from "@/shared/api/types";
import type { ReviewQueue, ReviewQueueBucket } from "@/features/systems/types";

/**
 * Las seis familias de la revisión del catálogo: el `type` que acepta el servidor, el cubo de la
 * respuesta donde viene cada una y su título. Cada familia se pide y se pagina POR SEPARADO: antes
 * las seis compartían una página y no traían `meta`, así que pasadas las 10 primeras filas nada era
 * alcanzable.
 */
export const REVIEW_FAMILIES = [
  { type: "endpoints", bucket: "endpoints", title: "Rutas", metric: "Rutas" },
  {
    type: "data_entities",
    bucket: "dataEntities",
    title: "Tablas",
    metric: "Tablas",
  },
  {
    type: "data_column_impacts",
    bucket: "dataColumnImpacts",
    title: "Columnas de datos",
    metric: "Columnas",
  },
  {
    type: "data_impacts",
    bucket: "dataEntityImpacts",
    title: "Qué ruta toca qué tabla",
    metric: "Impactos en tablas",
  },
  {
    type: "field_impacts",
    bucket: "fieldImpacts",
    title: "Qué ruta toca qué campo",
    metric: "Impactos en campos",
  },
  {
    type: "tool_requirements",
    bucket: "toolRequirements",
    title: "Herramientas que necesita cada ruta",
    metric: "Herramientas",
  },
] as const;

export type ReviewFamily = (typeof REVIEW_FAMILIES)[number];
export type ReviewFamilyType = ReviewFamily["type"];

export const REVIEW_PAGE_SIZE = 10;

/**
 * El cubo de una familia con su `meta`. Un servidor anterior sólo manda `total`: la página que se
 * pidió y ese total bastan para reconstruirla, porque el servidor ya paginaba por `page`.
 */
export function familyPage<T>(
  bucket: ReviewQueueBucket<T> | undefined,
  page: number,
): { items: T[]; meta: PaginationMeta } {
  const total = bucket?.total ?? 0;
  return {
    items: bucket?.items ?? [],
    meta: bucket?.meta ?? {
      page,
      limit: REVIEW_PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / REVIEW_PAGE_SIZE),
    },
  };
}

export function bucketOf(
  queue: ReviewQueue | undefined,
  family: ReviewFamily,
): ReviewQueueBucket<unknown> | undefined {
  return queue?.[family.bucket] as ReviewQueueBucket<unknown> | undefined;
}

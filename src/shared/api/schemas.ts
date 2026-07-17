import { z } from "zod";

/**
 * Esquemas de contrato para las formas de respuesta más frecuentes. Son solo de
 * validación: sin `.transform()` ni defaults (ver `validateContract`). Los tipos
 * derivados no reemplazan a los de `types.ts`; describen lo mínimo verificable.
 */

export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export type PaginationMetaShape = z.infer<typeof paginationMetaSchema>;

/**
 * Sobre paginado tal como queda tras `extractData` (que mapea `pagination` a
 * `meta`). Se pasa el esquema del item para validar también la forma de cada
 * elemento del listado.
 */
export function paginatedSchema<TItem extends z.ZodTypeAny>(item: TItem) {
  return z.object({
    items: z.array(item),
    meta: paginationMetaSchema,
  });
}

/** Forma del payload de error del backend (`{ error: { code, message } }`). */
export const apiErrorPayloadSchema = z.object({
  requestId: z.string().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  timestamp: z.string(),
});

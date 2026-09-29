import type { PaginationMeta } from "@/shared/api/types";

/**
 * Los documentos que el cliente acepta al registrarse.
 *
 * El TEXTO vive en el backend, versionado, y no en el codigo de la app movil: cambiar una palabra de
 * la politica de privacidad no puede exigir una release del telefono.
 */
export type ConsentDocument = {
  id: string;
  documentCode: string | null;
  versionCode: string | null;
  language: string | null;
  title: string | null;
  summary: string | null;
  bodyMarkdown: string | null;
  contentUrl: string | null;
  requiresExplicitAction: boolean | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  status: string | null;
};

/** Cuántos documentos hay en el catálogo entero, sin filtros: no cambia al buscar ni al paginar. */
export type ConsentDocumentSummary = {
  total: number;
  published: number;
  draft: number;
  retired: number;
};

export type ConsentDocumentList = {
  items: ConsentDocument[];
  meta?: PaginationMeta;
  summary?: ConsentDocumentSummary;
};

export type ConsentDocumentQuery = {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
};

/** Correccion de un documento: nunca su codigo ni su version. */
export type ConsentDocumentUpdate = {
  title?: string;
  summary?: string;
  bodyMarkdown?: string;
  requiresExplicitAction?: boolean;
  status?: "draft" | "published" | "retired";
};

/** Publicacion de una version nueva. Retira la anterior del mismo codigo e idioma. */
export type ConsentDocumentCreate = {
  documentCode: string;
  versionCode: string;
  language: string;
  title: string;
  summary?: string;
  bodyMarkdown: string;
  requiresExplicitAction: boolean;
  effectiveFrom: string;
};

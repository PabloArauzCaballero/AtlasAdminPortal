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

export type ConsentDocumentList = { items: ConsentDocument[] };

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

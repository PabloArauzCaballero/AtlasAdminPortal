import { apiRequest } from "@/shared/api/client";
import { isAtlasApiError } from "@/shared/api/errors";
import type {
  CreateArticleInput,
  CreatedArticle,
  CreateVersionInput,
  KnowledgeArticleDetail,
  KnowledgeArticleRow,
  KnowledgeArticlesQuery,
  KnowledgePage,
  KnowledgeVersion,
  KnowledgeVersionDetail,
  KnowledgeVersionRow,
  KnowledgeVersionsQuery,
  VersionTransition,
} from "./knowledge-types";

const BASE = "/admin/support/knowledge";

/**
 * Crear el artículo y su versión llevan una clave de idempotencia ESTABLE por formulario.
 *
 * Quien llama genera la clave al abrir el formulario y la conserva hasta que sale bien: un doble clic
 * o un reintento tras un corte reenvía la misma clave y el servidor devuelve la primera respuesta en
 * vez de crear una segunda versión idéntica. Las transiciones (revisión, aprobación, publicación) no
 * la necesitan igual: el propio estado de la versión rechaza la repetida con 409.
 */
export function newIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function post<T>(path: string, body: unknown, idempotencyKey: string) {
  return apiRequest<T>(path, {
    method: "POST",
    body,
    headers: { "x-idempotency-key": idempotencyKey },
  });
}

export function createKnowledgeArticle(
  body: CreateArticleInput,
  idempotencyKey: string,
) {
  return post<CreatedArticle>(`${BASE}/articles`, body, idempotencyKey);
}

export function createKnowledgeVersion(
  articleId: string,
  body: CreateVersionInput,
  idempotencyKey: string,
) {
  return post<KnowledgeVersion>(
    `${BASE}/articles/${encodeURIComponent(articleId)}/versions`,
    body,
    idempotencyKey,
  );
}

export type VersionAction = "submit-review" | "approve" | "publish";

/** `publish` retira la versión publicada anterior del mismo idioma: se manda explícito. */
export function transitionKnowledgeVersion(
  versionId: string,
  action: VersionAction,
  note?: string,
) {
  const body: Record<string, unknown> = note ? { note } : {};
  if (action === "publish") body.retirePrevious = true;
  return post<VersionTransition>(
    `${BASE}/versions/${encodeURIComponent(versionId)}/${action}`,
    body,
    newIdempotencyKey(`knowledge-${action}`),
  );
}

/** Sin filtros vacíos: el servidor valida con Zod y `status=""` sería un 400, no «todos». */
function compact<T extends Record<string, unknown>>(query: T) {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([, valor]) => valor !== undefined && valor !== null && valor !== "",
    ),
  ) as Record<string, string | number>;
}

/**
 * Las lecturas del personal: TODOS los estados y TODAS las audiencias, guías internas incluidas.
 * Son las mismas rutas y los mismos roles que las escrituras, así que quien puede aprobar también
 * puede leer lo que aprueba.
 */
export function listKnowledgeArticles(query: KnowledgeArticlesQuery) {
  return apiRequest<KnowledgePage<KnowledgeArticleRow>>(`${BASE}/articles`, {
    query: compact(query),
  });
}

export function getKnowledgeArticle(articleId: string) {
  return apiRequest<KnowledgeArticleDetail>(
    `${BASE}/articles/${encodeURIComponent(articleId)}`,
  );
}

export function listKnowledgeVersions(query: KnowledgeVersionsQuery) {
  return apiRequest<KnowledgePage<KnowledgeVersionRow>>(`${BASE}/versions`, {
    query: compact(query),
  });
}

/** La ficha con el texto completo: es lo que lee quien aprueba antes de aprobar. */
export function getKnowledgeVersion(versionId: string) {
  return apiRequest<KnowledgeVersionDetail>(
    `${BASE}/versions/${encodeURIComponent(versionId)}`,
  );
}

const MENSAJES: Record<string, string> = {
  KNOWLEDGE_ARTICLE_KEY_TAKEN:
    "Ya existe un artículo con esa clave. Búscalo y redacta una versión nueva en lugar de crear otro.",
  KNOWLEDGE_SELF_APPROVAL_FORBIDDEN:
    "Quien redactó esta versión no puede aprobarla. Pásale el número de versión a otra persona del equipo.",
  KNOWLEDGE_DOMAIN_APPROVER_REQUIRED:
    "Este artículo es de un equipo con consecuencias legales o de riesgo: lo aprueba alguien de riesgo o cumplimiento.",
  KNOWLEDGE_VERSION_NOT_DRAFT:
    "Sólo se envía a revisión una versión en borrador. Esta ya avanzó.",
  KNOWLEDGE_VERSION_NOT_IN_REVIEW:
    "Sólo se aprueba una versión que esté en revisión. Envíala a revisión primero.",
  KNOWLEDGE_VERSION_NOT_APPROVED:
    "Sólo se publica una versión aprobada. Falta la aprobación de otra persona.",
  KNOWLEDGE_VERSION_NOT_FOUND: "No existe ninguna versión con ese número.",
  KNOWLEDGE_ARTICLE_NOT_FOUND: "No existe ningún artículo con ese número.",
  KNOWLEDGE_EDITOR_REQUIRED:
    "Redactar y aprobar la ayuda es tarea del equipo interno.",
};

export function knowledgeErrorMessage(error: unknown): string {
  if (!isAtlasApiError(error))
    return "No se pudo completar la acción. Inténtalo de nuevo.";
  if (MENSAJES[error.code]) return MENSAJES[error.code];
  if (error.status === 403)
    return "Tu rol no alcanza para gestionar la base de conocimiento.";
  return error.message;
}

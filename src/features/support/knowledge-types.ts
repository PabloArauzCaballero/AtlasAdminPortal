import type { Option } from "@/shared/lib/options";

/**
 * El contrato de `admin/support/knowledge/*` y de la búsqueda de ayuda.
 *
 * Un artículo es sólo su identidad y su gobierno (clave, audiencia, equipo dueño); el texto vive en
 * sus VERSIONES, que recorren BORRADOR → EN REVISIÓN → APROBADA → PUBLICADA. Lo publicado no se
 * edita: se redacta otra versión, y por eso se puede responder «qué decía el 3 de marzo».
 */
export type KnowledgeAudience =
  "PUBLIC_CONSUMER" | "AUTHENTICATED_CONSUMER" | "PARTNER" | "INTERNAL_SUPPORT";

export type KnowledgeVersionStatus =
  "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "RETIRED";

export type CreateArticleInput = {
  articleKey: string;
  audience: KnowledgeAudience;
  categoryCode?: string;
  ownerTeam: string;
  isFaq: boolean;
  isFeatured: boolean;
  reviewCycleDays: number;
};

export type CreatedArticle = {
  articleId: string;
  articleKey: string;
  status: string;
};

export type CreateVersionInput = {
  locale: string;
  title: string;
  question?: string;
  shortAnswer?: string;
  bodyMarkdown: string;
  tags: string[];
  canonicalQueryTerms: string[];
  escalateWhen: string;
  changeReason: string;
};

export type KnowledgeVersion = {
  articleId: string;
  articleKey: string;
  versionId: string;
  versionNumber: number;
  locale: string;
  status: KnowledgeVersionStatus;
  title: string;
  question: string | null;
  shortAnswer: string | null;
  body: string;
  tags: string[];
  escalateWhen: string | null;
  publishedAt: string | null;
  checksum: string | null;
};

export type VersionTransition = {
  versionId: string;
  status: KnowledgeVersionStatus;
  articleId?: string;
};

export type KnowledgePage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Un artículo en la lista del personal: cualquier estado y cualquier audiencia. */
export type KnowledgeArticleRow = {
  articleId: string;
  articleKey: string;
  audience: KnowledgeAudience;
  status: KnowledgeVersionStatus;
  ownerTeam: string;
  currentVersionId: string | null;
  isFaq: boolean;
  isFeatured: boolean;
  nextReviewAt: string | null;
  helpfulCount: number;
  notHelpfulCount: number;
  updatedAt: string | null;
};

/** Una versión en la cola de trabajo; el texto completo sólo viene en su ficha. */
export type KnowledgeVersionRow = {
  versionId: string;
  articleId: string;
  versionNumber: number;
  locale: string;
  status: KnowledgeVersionStatus;
  title: string;
  question: string | null;
  shortAnswer: string | null;
  createdByInternalUserId: string | number | null;
  reviewedByInternalUserId: string | number | null;
  approvedByInternalUserId: string | number | null;
  approvedAt: string | null;
  publishedAt: string | null;
  retiredAt: string | null;
  changeReason: string | null;
  updatedAt: string | null;
};

export type KnowledgeVersionDetail = KnowledgeVersionRow & {
  bodyMarkdown: string;
  tags: string[] | null;
  escalateWhen: string | null;
};

export type KnowledgeArticleDetail = KnowledgeArticleRow & {
  versions: KnowledgeVersionRow[];
};

export type KnowledgeArticlesQuery = {
  status?: string;
  audience?: string;
  search?: string;
  page: number;
  pageSize: number;
};

export type KnowledgeVersionsQuery = {
  status?: string;
  articleId?: string;
  page: number;
  pageSize: number;
};

/** Quien redactó una versión no puede aprobarla: el servidor lo rechaza y la pantalla no lo ofrece. */
export function isOwnVersion(
  version: Pick<KnowledgeVersionRow, "createdByInternalUserId">,
  userId: string | null | undefined,
): boolean {
  return (
    Boolean(userId) &&
    version.createdByInternalUserId !== null &&
    String(version.createdByInternalUserId) === String(userId)
  );
}

export const AUDIENCIA_OPTIONS: Option[] = [
  {
    value: "PUBLIC_CONSUMER",
    label: "Público",
    description:
      "Cualquiera lo lee, incluso sin cuenta: la ayuda general de la app.",
  },
  {
    value: "AUTHENTICATED_CONSUMER",
    label: "Clientes con cuenta",
    description:
      "Sólo lo ve un cliente que inició sesión; útil para pasos sobre su crédito.",
  },
  {
    value: "PARTNER",
    label: "Comercios",
    description:
      "Sólo lo ven los usuarios de un comercio desde su portal de ayuda.",
  },
  {
    value: "INTERNAL_SUPPORT",
    label: "Guía interna",
    description:
      "Sólo lo lee el equipo de Atlas; nunca aparece en la app ni en el portal del comercio.",
  },
];

/**
 * Los equipos de la lista de abajo exigen un aprobador de riesgo o cumplimiento.
 *
 * Es copia declarada de `DOMAIN_APPROVAL_TEAMS` del servicio de conocimiento: un artículo de crédito,
 * seguridad, legal, KYC, privacidad o pagos es una declaración con consecuencias y no lo aprueba el
 * equipo de contenido.
 */
export const EQUIPOS_CON_APROBADOR_DE_DOMINIO = [
  "credit",
  "risk",
  "security",
  "legal",
  "kyc",
  "privacy",
  "payments",
];

const EQUIPOS: [string, string, string][] = [
  [
    "support",
    "Soporte",
    "Guías de uso de la app y del portal; las aprueba cualquier persona del equipo que no las haya redactado.",
  ],
  [
    "credit",
    "Crédito",
    "Cómo se pide, se decide y se paga un crédito; lo aprueba riesgo o cumplimiento.",
  ],
  [
    "risk",
    "Riesgo",
    "Criterios de evaluación y límites; lo aprueba riesgo o cumplimiento.",
  ],
  [
    "payments",
    "Pagos",
    "Cobros, comprobantes y reversos; lo aprueba riesgo o cumplimiento.",
  ],
  [
    "kyc",
    "Identidad",
    "Verificación de carnet y selfie; lo aprueba riesgo o cumplimiento.",
  ],
  [
    "security",
    "Seguridad",
    "Fraude, accesos y bloqueos de cuenta; lo aprueba riesgo o cumplimiento.",
  ],
  [
    "privacy",
    "Privacidad",
    "Qué datos se guardan y cómo pedir su borrado; lo aprueba riesgo o cumplimiento.",
  ],
  [
    "legal",
    "Legal",
    "Condiciones, contratos y reclamos formales; lo aprueba riesgo o cumplimiento.",
  ],
];

export const EQUIPO_OPTIONS: Option[] = EQUIPOS.map(
  ([value, label, description]) => ({ value, label, description }),
);

export const SI_NO_OPTIONS: Option[] = [
  {
    value: "no",
    label: "No",
    description: "Sólo aparece cuando alguien lo busca por sus palabras.",
  },
  {
    value: "si",
    label: "Sí",
    description:
      "Además aparece en la lista de preguntas frecuentes sin buscar.",
  },
];

export const ESTADO_VERSION: Record<
  KnowledgeVersionStatus,
  { label: string; tone: "muted" | "warning" | "success" | "info" }
> = {
  DRAFT: { label: "Borrador", tone: "muted" },
  IN_REVIEW: { label: "En revisión", tone: "warning" },
  APPROVED: { label: "Aprobada", tone: "info" },
  PUBLISHED: { label: "Publicada", tone: "success" },
  RETIRED: { label: "Retirada", tone: "muted" },
};

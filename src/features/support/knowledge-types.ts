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

export type KnowledgeSearchHit = {
  articleId: string;
  articleKey: string;
  versionId: string;
  title: string;
  question: string | null;
  shortAnswer: string | null;
  audience: KnowledgeAudience;
  isFaq: boolean;
  rank: number;
};

/** Una versión que se redactó o movió desde este navegador: su número es lo que hay que compartir. */
export type TrackedVersion = {
  versionId: string;
  articleId: string;
  articleKey: string;
  title: string;
  status: KnowledgeVersionStatus;
  updatedAt: string;
};

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

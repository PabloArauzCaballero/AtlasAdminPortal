import { Badge } from "@/shared/components/ui/badges";
import type {
  AccessTokenStatus,
  CredentialStatus,
  ProviderAuthMethod,
} from "./types";

/**
 * Badges propios para el estado de la credencial.
 *
 * No se reutiliza `StatusBadge` a propósito. Ese componente cae en gris para cualquier valor que
 * no esté en sus listas, y `EXPIRED`, `REVOKED` o `MISSING` se pintarían igual que un estado
 * neutro — exactamente el fallo que el comentario de `badges.tsx` advierte para un semáforo. Y
 * añadirlos a las listas compartidas daría tono crítico a esos mismos literales en otras
 * pantallas donde no significan lo mismo. El mapeo vive aquí, acotado a credenciales.
 */

const CREDENTIAL_LABELS: Record<CredentialStatus, string> = {
  ACTIVE: "Activa",
  MISSING: "Sin credencial",
  EXPIRED: "Vencida",
  ROTATION_DUE: "Por rotar",
  REVOKED: "Revocada",
  NOT_REQUIRED: "No requiere",
};

const CREDENTIAL_TONES: Record<
  CredentialStatus,
  "success" | "warning" | "critical" | "muted"
> = {
  ACTIVE: "success",
  MISSING: "critical",
  EXPIRED: "critical",
  ROTATION_DUE: "warning",
  REVOKED: "critical",
  NOT_REQUIRED: "muted",
};

export function CredentialStatusBadge({
  value,
}: Readonly<{ value?: CredentialStatus | null }>) {
  if (!value) return <Badge tone="muted">—</Badge>;
  return (
    <Badge tone={CREDENTIAL_TONES[value]} dot>
      {CREDENTIAL_LABELS[value]}
    </Badge>
  );
}

const TOKEN_LABELS: Record<AccessTokenStatus, string> = {
  VALID: "Token vigente",
  EXPIRING: "Token por renovar",
  EXPIRED: "Token vencido",
  NONE: "Sin token",
  REFRESH_FAILED: "Renovación fallida",
};

const TOKEN_TONES: Record<
  AccessTokenStatus,
  "success" | "warning" | "critical" | "muted"
> = {
  VALID: "success",
  EXPIRING: "warning",
  EXPIRED: "warning",
  NONE: "muted",
  REFRESH_FAILED: "critical",
};

export function TokenStatusBadge({
  value,
}: Readonly<{ value?: AccessTokenStatus | null }>) {
  if (!value) return <Badge tone="muted">—</Badge>;
  return <Badge tone={TOKEN_TONES[value]}>{TOKEN_LABELS[value]}</Badge>;
}

const METHOD_LABELS: Record<ProviderAuthMethod, string> = {
  oauth2_client_credentials: "OAuth2 client credentials",
  jwt_bearer: "Aserción JWT (RFC 7523)",
  mtls: "mTLS (RFC 8705)",
  api_key: "Clave de API",
  none: "Sin autenticación",
};

export function AuthMethodBadge({
  value,
}: Readonly<{ value?: ProviderAuthMethod | null }>) {
  if (!value) return <Badge tone="muted">—</Badge>;
  return (
    <Badge tone={value === "api_key" ? "warning" : "info"}>
      {METHOD_LABELS[value]}
    </Badge>
  );
}

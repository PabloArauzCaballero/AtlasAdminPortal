import {
  getInternalAuthStorageMode,
  isCookieBackedSession,
  isSessionExpired,
} from "@/shared/auth/auth-session-policy";
import type { InternalSession } from "@/shared/auth/types";

export type SessionCheck = {
  key: string;
  label: string;
  status: "ok" | "warning" | "blocked";
  description: string;
};

export function buildSessionChecks(session: InternalSession | null) {
  const cookieBacked = isCookieBackedSession(session);
  const expired = isSessionExpired(session);
  const mode = getInternalAuthStorageMode();

  return [
    {
      key: "auth_mode",
      label: "Modo de autenticación",
      status: cookieBacked ? "ok" : mode === "cookie" ? "blocked" : "warning",
      description: cookieBacked
        ? "La sesión se apoya en cookies seguras del servicio interno."
        : "La sesión todavía conserva tokens accesibles al navegador.",
    },
    {
      key: "session_expiration",
      label: "Vencimiento de sesión",
      status: expired ? "blocked" : "ok",
      description: expired
        ? "La sesión local está vencida y debe renovarse."
        : "El perfil interno no reporta una sesión vencida.",
    },
    {
      key: "mfa",
      label: "Segundo factor",
      status: session?.user.mfaEnabled ? "ok" : "warning",
      description: session?.user.mfaEnabled
        ? "El usuario reporta MFA activo."
        : "Conviene exigir MFA para todo acceso administrativo.",
    },
    {
      key: "secure_context",
      label: "Contexto seguro",
      status: isSecureRuntime() ? "ok" : "blocked",
      description:
        "Producción debe servirse con HTTPS para cookies Secure y APIs internas.",
    },
  ] satisfies SessionCheck[];
}

function isSecureRuntime() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || window.location.hostname === "localhost";
}

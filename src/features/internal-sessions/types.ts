import type { PaginationMeta } from "@/shared/api/types";

/** Una sesión abierta del personal, como la sirve `GET /internal/sessions`. */
export type InternalSessionItem = {
  sessionId: string;
  internalUserId: string;
  fullName: string | null;
  email: string | null;
  status: string | null;
  lastLoginAt: string | null;
  /** Última vez que esa sesión renovó su token: no es el primer login. */
  renewedAt: string;
  expiresAt: string;
  /** Renovada dentro de la última hora (`summary.activeWindowMinutes`). */
  activeNow: boolean;
  ipAddress: string | null;
  userAgent: string | null;
};

export type InternalSessionsListResponse = {
  items: InternalSessionItem[];
  meta: PaginationMeta;
  summary: {
    openSessions: number;
    people: number;
    activeWindowMinutes: number;
  };
};

export type RevokeInternalSessionsResult = {
  internalUserId: string;
  revokedSessions: number;
};

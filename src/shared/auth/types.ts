export type InternalUser = {
  id: string;
  tenantId?: string;
  email: string;
  fullName: string;
  userCode?: string | null;
  status: string;
  department?: string | null;
  jobTitle?: string | null;
  mustChangePassword?: boolean;
  mfaEnabled?: boolean;
  roles: string[];
  legacyRoles?: string[];
  permissions: string[];
  effectivePermissions?: unknown[];
  permissionKeys?: unknown[];
};

export type InternalAccessProfile = {
  user: InternalUser;
  permissions?: unknown[];
  session?: {
    expiresAt?: string;
    issuedAt?: string;
  };
};

export type InternalAuthResponse = InternalAccessProfile & {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: "Bearer" | "Cookie";
  expiresIn?: string;
  csrfToken?: string;
};

export type InternalSession = InternalAuthResponse;

export type LoginInput = {
  tenantId: string;
  email: string;
  password: string;
};

import type { PaginationMeta } from "@/shared/api/types";

export type InternalUserListItem = {
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
};

export type InternalUsersListResponse = {
  items: InternalUserListItem[];
  pagination?: PaginationMeta;
};

export type InternalUserProfile = { user: InternalUserListItem };

export type InternalUserDepartment =
  | "OPERATIONS"
  | "RISK"
  | "COLLECTIONS"
  | "COMPLIANCE"
  | "FINANCE"
  | "SUPPORT"
  | "SYSTEMS"
  | "AUDIT"
  | "EXECUTIVE";

export type InternalUserStatus =
  "active" | "invited" | "suspended" | "locked" | "disabled";

export type UpdateInternalUserInput = {
  fullName?: string;
  department?: InternalUserDepartment;
  jobTitle?: string | null;
  status?: InternalUserStatus;
  mustChangePassword?: boolean;
  reason: string;
};

/**
 * El alta real usa POST /internal/auth/signup (requiere password en el
 * contrato del backend) seguido de PATCH /internal/users/:id/roles. El
 * formulario nunca deja que un admin escriba la contraseña de otra persona:
 * se genera una temporal al azar client-side (ver temporary-password.ts) y
 * se fuerza mustChangePassword tras el alta.
 */
export type CreateInternalUserInput = {
  email: string;
  fullName: string;
  department: InternalUserDepartment;
  jobTitle?: string;
  roles: string[];
  reason: string;
};

export type CreateInternalUserResult = {
  user: InternalUserListItem;
  temporaryPassword: string;
};

export type InternalRole = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
  userCount?: number;
  permissions: string[];
};

export type InternalPermission = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  module: string;
  action: string;
  status: string;
};

export type InternalRolesListResponse = {
  items: InternalRole[];
  pagination?: PaginationMeta;
};

export type InternalPermissionsListResponse = {
  items: InternalPermission[];
  pagination?: PaginationMeta;
};

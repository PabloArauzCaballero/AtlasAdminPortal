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

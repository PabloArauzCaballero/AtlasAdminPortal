export const MERCHANT_USER_STATUSES = [
  "invited",
  "active",
  "suspended",
  "disabled",
] as const;

export type MerchantUserStatus = (typeof MERCHANT_USER_STATUSES)[number];

export type MerchantUserProfile = {
  /** El backend lo serializa como `id`, no como `merchantUserId`. */
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  userCode?: string | null;
  role?: string;
  status: MerchantUserStatus | string;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  [key: string]: unknown;
};

/** El listado no usa `{items, meta}`: devuelve los tres campos sueltos. */
export type MerchantUserList = {
  items: MerchantUserProfile[];
  page: number;
  limit: number;
  total: number;
};

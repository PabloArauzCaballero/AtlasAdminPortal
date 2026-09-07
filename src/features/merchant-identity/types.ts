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

export const MERCHANT_PROVISIONING_STATUSES = [
  "pending",
  "provisioned",
  "rejected",
] as const;

export type MerchantProvisioningStatus =
  (typeof MERCHANT_PROVISIONING_STATUSES)[number];

/**
 * Una petición de alta encolada por el ERP.
 *
 * `accountName` y `branchName` son una COPIA que manda el ERP para que se pueda saber qué se está
 * aprobando sin salir de la pantalla; la fuente de verdad de la relación comercial sigue siendo el
 * ERP. `externalReference` es la fila de allá, y es lo que se cita cuando hay que pedir una
 * corrección.
 */
export type MerchantProvisioningRequest = {
  id: string;
  source: string;
  externalReference: string;
  accountReference: string | null;
  accountName: string | null;
  branchName: string | null;
  email: string;
  fullName: string;
  phone: string | null;
  roleCode: string | null;
  requestedBy: string | null;
  requestedAt: string;
  status: MerchantProvisioningStatus | string;
  merchantUserId: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
};

export type MerchantProvisioningList = {
  items: MerchantProvisioningRequest[];
  page: number;
  limit: number;
  total: number;
};

/**
 * Lo que devuelve conceder un acceso.
 *
 * `temporaryPassword` llega UNA vez y no hay ninguna lectura posterior que la devuelva: si se
 * cierra el diálogo sin copiarla, el camino es restablecerla, no volver a consultarla.
 */
export type MerchantProvisioningResult = {
  request: MerchantProvisioningRequest;
  merchantUser: MerchantUserProfile;
  temporaryPassword: string;
};

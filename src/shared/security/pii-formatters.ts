/**
 * Enmascarado de datos personales para mostrar en UI sin revelar el valor
 * completo. Son funciones puras; el control de acceso (quién puede revelar) vive
 * en el componente/permiso que las usa, no aquí.
 */

export type PiiType = "email" | "phone" | "document" | "account" | "generic";

const DOT = "•";
const MIN_MASK = 3;

/** Oculta todo menos los últimos `keep` caracteres. */
function maskKeepEnd(value: string, keep: number): string {
  if (value.length <= keep) return DOT.repeat(Math.max(value.length, MIN_MASK));
  const hidden = value.length - keep;
  return DOT.repeat(hidden) + value.slice(hidden);
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return maskKeepEnd(email, 0);
  const local = email.slice(0, at);
  const domain = email.slice(at);
  return `${local.slice(0, 1)}${DOT.repeat(Math.max(local.length - 1, MIN_MASK))}${domain}`;
}

/** Deja visibles los últimos 4 dígitos (ignora espacios y separadores). */
export function maskPhone(phone: string): string {
  return maskKeepEnd(phone.replace(/[\s\-().]/g, ""), 4);
}

export function maskDocument(doc: string): string {
  return maskKeepEnd(doc.trim(), 3);
}

export function maskAccount(account: string): string {
  return maskKeepEnd(account.replace(/[\s\-]/g, ""), 4);
}

export function maskGeneric(value: string): string {
  return maskKeepEnd(value, 0);
}

const MASKERS: Record<PiiType, (value: string) => string> = {
  email: maskEmail,
  phone: maskPhone,
  document: maskDocument,
  account: maskAccount,
  generic: maskGeneric,
};

export function maskByType(value: string, type: PiiType): string {
  if (!value) return "";
  return MASKERS[type](value);
}

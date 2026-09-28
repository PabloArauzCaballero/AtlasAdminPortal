import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import type { RatingSweepResult } from "./types";

/**
 * Quién puede qué en esta pantalla: copia declarada de los `@Roles(...)` del backend.
 *
 * - `CreditRatingOperationsController` (`sweep`, `loans/:id/rate`, `customers/:id/rate`): recalificar
 *   lo hacen riesgo, operación y administración. `compliance_analyst` LEE la cartera pero no la
 *   recalifica: antes se le ofrecían los botones y cada uno terminaba en un 403 mudo.
 * - `LoansOperationsController` `GET outcome-backlog`: sólo riesgo y administración. Sin esto, a
 *   quien no tenía acceso se le decía «Ningún desenlace agotó sus reintentos», que es mentira.
 *
 * Si el backend cambia sus `@Roles`, estas listas cambian con él.
 */
export const RATING_OPERATE_ROLES: string[] = [
  "risk_analyst",
  "internal_operator",
  "admin",
  "platform_admin",
];

export const OUTCOME_BACKLOG_ROLES: string[] = [
  "risk_analyst",
  "admin",
  "platform_admin",
];

/** El backend sólo acepta identificadores numéricos positivos; con otra cosa respondía un 400 crudo. */
export function isDatabaseId(valor: string): boolean {
  return /^[1-9][0-9]*$/.test(valor.trim());
}

/** El resultado del barrido, en una frase: cuántos se recorrieron, cuántos salieron y cuáles fallaron. */
export function describeSweep(resultado: RatingSweepResult): string {
  const recorridos = resultado.customers ?? 0;
  const calificados = resultado.rated ?? 0;
  const fallidos = resultado.failed ?? 0;
  const base = `Se recorrieron ${formatNumber(recorridos)} clientes con deuda viva: ${formatNumber(calificados)} calificados`;
  if (fallidos === 0) return `${base} y ninguno falló.`;
  const ids = resultado.failedCustomerIds ?? [];
  const lista = ids.length > 0 ? ` (clientes ${ids.join(", ")})` : "";
  return `${base} y ${formatNumber(fallidos)} fallaron${lista}.`;
}

type Calificacion = { grade?: string; gradeLabel?: string } | null;

function categoria(c: Calificacion | undefined): string {
  if (!c?.grade) return "sin categoría";
  return c.gradeLabel
    ? `categoría ${c.grade} (${c.gradeLabel})`
    : `categoría ${c.grade}`;
}

/** Lo que quedó tras recalificar un crédito: el crédito y, por arrastre, su titular. */
export function describeLoanRating(
  loanId: string,
  resultado: { loanRating?: Calificacion; customerRating?: Calificacion },
): string {
  return `Crédito ${loanId} recalificado: ${categoria(resultado.loanRating)}. Su titular quedó en ${categoria(resultado.customerRating)}.`;
}

/** Lo que quedó tras recalificar a un cliente y todas sus deudas. */
export function describeCustomerRating(
  customerId: string,
  resultado: { loanRatings?: unknown[]; customerRating?: Calificacion },
): string {
  const deudas = resultado.loanRatings?.length ?? 0;
  return `Cliente ${customerId} recalificado: ${categoria(resultado.customerRating)}, con ${formatNumber(deudas)} deudas calificadas.`;
}

/** Por qué no se pudo recalificar, sin códigos del backend delante. */
export function ratingErrorMessage(
  error: unknown,
  sujeto: "crédito" | "cliente" | "cartera",
): string {
  const respaldo =
    sujeto === "cartera"
      ? "No se pudo recalificar la cartera."
      : `No se pudo recalificar el ${sujeto}.`;
  if (!isAtlasApiError(error)) return respaldo;
  const texto = `${error.code} ${error.message}`;
  if (texto.includes("RATING_POLICY_NOT_ACTIVE")) {
    return "No hay matriz de calificación vigente: sin política activa no se puede calificar nada.";
  }
  if (texto.includes("LOAN_NOT_RATEABLE")) {
    return "Ese crédito no está en un estado que se califique (por ejemplo, cerrado o sin desembolsar).";
  }
  if (texto.includes("LOAN_NOT_FOUND") || error.status === 404) {
    return `No existe un ${sujeto === "cartera" ? "registro" : sujeto} con ese número.`;
  }
  if (error.status === 403) {
    return "Tu usuario no tiene permiso para recalificar.";
  }
  return error.message || respaldo;
}

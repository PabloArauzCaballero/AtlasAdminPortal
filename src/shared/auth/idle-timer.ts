/**
 * El reloj del cierre por inactividad (ADM-06, auditoría 2026-10-09), sin React para poder
 * probarlo con fechas fijas.
 *
 * 15 minutos sin actividad cierran la sesión; al minuto 14 se avisa. Es el plazo que pide la
 * política de seguridad para un puesto con acceso administrativo: un portal abierto en un equipo
 * compartido no puede quedarse dentro indefinidamente. La actividad se comparte entre pestañas
 * (`idle-logout-guard.tsx`): trabajar en una mantiene vivas las demás.
 */
export const IDLE_LIMIT_MS = 15 * 60_000;
export const IDLE_WARNING_MS = 14 * 60_000;

export type IdlePhase =
  | { kind: "active" }
  | { kind: "warning"; remainingSeconds: number }
  | { kind: "expired" };

export function idlePhase(lastActivityAt: number, now: number): IdlePhase {
  const idle = Math.max(0, now - lastActivityAt);
  if (idle >= IDLE_LIMIT_MS) return { kind: "expired" };
  if (idle >= IDLE_WARNING_MS) {
    return {
      kind: "warning",
      remainingSeconds: Math.ceil((IDLE_LIMIT_MS - idle) / 1000),
    };
  }
  return { kind: "active" };
}

export function samePhase(a: IdlePhase, b: IdlePhase): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "warning" && b.kind === "warning") {
    return a.remainingSeconds === b.remainingSeconds;
  }
  return true;
}

/** `75` → `1:15`. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Mensajes entre pestañas. Sólo el tipo y una hora: nunca datos de la sesión. */
export type IdleBroadcast =
  { type: "ACTIVITY"; at: number } | { type: "IDLE_LOGOUT" };

export function isIdleBroadcast(value: unknown): value is IdleBroadcast {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (message.type === "IDLE_LOGOUT") return true;
  return message.type === "ACTIVITY" && typeof message.at === "number";
}

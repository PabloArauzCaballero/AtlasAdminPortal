import type { SessionInvestigationSummary } from "./types";

/**
 * Señal de riesgo derivada del resumen. La pregunta del analista es "¿esta
 * sesión es legítima?", así que las banderas se agregan acá una sola vez en vez
 * de dejarlas enterradas en las tablas de cada pestaña.
 */
export type SessionSignal = {
  label: string;
  /** `true` = la señal está encendida (sospechosa); `null` = sin telemetría. */
  active: boolean | null;
  hint: string;
};

/**
 * `some(x => x === true)` en vez de `some(Boolean)` a propósito: los flags son
 * `boolean | null` y `null` significa "no observado", no "no". Una señal solo
 * se enciende con una observación afirmativa.
 */
function anyTrue<T>(
  items: T[],
  pick: (item: T) => boolean | null,
): boolean | null {
  if (items.length === 0) return null;
  if (items.some((item) => pick(item) === true)) return true;
  if (items.every((item) => pick(item) === null)) return null;
  return false;
}

/**
 * Combina señales de varias fuentes con la misma regla tri-estado: basta que
 * una afirme para encender; solo es `null` si ninguna observó nada.
 *
 * No se puede usar `??` para esto: `??` solo cae a la derecha cuando la
 * izquierda es `null`, así que una fuente que observó `false` (ej. la IP no es
 * VPN) taparía a otra que sí detectó la señal (ej. el dispositivo reporta VPN).
 * Justo el falso negativo que esta pantalla no se puede permitir.
 */
function anyTrueAcross(...values: Array<boolean | null>): boolean | null {
  if (values.some((value) => value === true)) return true;
  if (values.every((value) => value === null)) return null;
  return false;
}

export function countFailedAuthEvents(
  summary: SessionInvestigationSummary,
): number {
  return summary.authEvents.filter((event) => event.loginSuccessful === false)
    .length;
}

export function countDeniedPermissions(
  summary: SessionInvestigationSummary,
): number {
  return summary.permissions.filter(
    (permission) => permission.granted === false,
  ).length;
}

export function buildSessionSignals(
  summary: SessionInvestigationSummary,
): SessionSignal[] {
  const { deviceSnapshots, ipReputation } = summary;
  return [
    {
      label: "VPN",
      active: anyTrueAcross(
        anyTrue(ipReputation, (item) => item.isVpn),
        anyTrue(deviceSnapshots, (item) => item.vpnDetected),
      ),
      hint: "Reputación de IP o snapshot del dispositivo",
    },
    {
      label: "Proxy",
      active: anyTrue(ipReputation, (item) => item.isProxy),
      hint: "Reputación de IP",
    },
    {
      label: "Tor",
      active: anyTrue(ipReputation, (item) => item.isTor),
      hint: "Reputación de IP",
    },
    {
      label: "Rooteado",
      active: anyTrue(deviceSnapshots, (item) => item.isRooted),
      hint: "Snapshot del dispositivo",
    },
    {
      label: "Emulador",
      active: anyTrue(deviceSnapshots, (item) => item.isEmulator),
      hint: "Snapshot del dispositivo",
    },
  ];
}

/** Cantidad de señales encendidas: el titular de la vista. */
export function countActiveSignals(signals: SessionSignal[]): number {
  return signals.filter((signal) => signal.active === true).length;
}

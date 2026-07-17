import { describe, expect, it } from "vitest";
import {
  buildSessionSignals,
  countActiveSignals,
  countDeniedPermissions,
  countFailedAuthEvents,
  type SessionSignal,
} from "@/features/operations-sessions/session-signals";
import type { SessionInvestigationSummary } from "@/features/operations-sessions/types";

function summaryWith(
  overrides: Partial<SessionInvestigationSummary> = {},
): SessionInvestigationSummary {
  return {
    session: {
      sessionId: "1",
      customerId: null,
      deviceId: null,
      status: "ACTIVE",
      channel: null,
      authMethod: null,
      startedAt: null,
      endedAt: null,
      ipAddress: null,
      userAgent: null,
    },
    customer: null,
    device: null,
    gpsObservations: [],
    deviceSnapshots: [],
    permissions: [],
    authEvents: [],
    ipReputation: [],
    simObservations: [],
    deviceRiskEvents: [],
    customerActions: [],
    customerObservations: [],
    auditTrail: [],
    ...overrides,
  } as SessionInvestigationSummary;
}

function signal(signals: SessionSignal[], label: string): SessionSignal {
  const found = signals.find((item) => item.label === label);
  if (!found) throw new Error(`Señal inexistente: ${label}`);
  return found;
}

function ipRep(overrides: Record<string, unknown>) {
  return {
    id: "1",
    isVpn: null,
    isProxy: null,
    isTor: null,
    countryCode: null,
    city: null,
    reputationScore: null,
    capturedAt: null,
    ...overrides,
  };
}

function snapshot(overrides: Record<string, unknown>) {
  return {
    id: "1",
    capturedAt: null,
    appVersion: null,
    vpnDetected: null,
    isRooted: null,
    isEmulator: null,
    ...overrides,
  };
}

describe("buildSessionSignals · null significa 'no observado', no 'limpio'", () => {
  it("deja las señales en null cuando no hay telemetría", () => {
    // Sin datos no se puede decir que la sesión esté limpia. Devolver `false`
    // le diría al analista que es segura cuando en realidad nadie miró.
    const signals = buildSessionSignals(summaryWith());
    for (const item of signals) {
      expect(item.active).toBeNull();
    }
  });

  it("deja la señal en null si la observación existe pero el campo vino nulo", () => {
    const signals = buildSessionSignals(
      summaryWith({
        ipReputation: [ipRep({ isTor: null })],
      } as Partial<SessionInvestigationSummary>),
    );
    expect(signal(signals, "Tor").active).toBeNull();
  });

  it("enciende la señal solo con una observación afirmativa", () => {
    const signals = buildSessionSignals(
      summaryWith({
        ipReputation: [ipRep({ isProxy: true })],
      } as Partial<SessionInvestigationSummary>),
    );
    expect(signal(signals, "Proxy").active).toBe(true);
  });

  it("apaga la señal cuando se observó y dio negativo", () => {
    const signals = buildSessionSignals(
      summaryWith({
        ipReputation: [ipRep({ isProxy: false })],
      } as Partial<SessionInvestigationSummary>),
    );
    expect(signal(signals, "Proxy").active).toBe(false);
  });

  it("basta una observación afirmativa entre varias para encender", () => {
    const signals = buildSessionSignals(
      summaryWith({
        deviceSnapshots: [
          snapshot({ isRooted: false }),
          snapshot({ id: "2", isRooted: true }),
        ],
      } as Partial<SessionInvestigationSummary>),
    );
    expect(signal(signals, "Rooteado").active).toBe(true);
  });
});

describe("buildSessionSignals · VPN combina dos fuentes", () => {
  it("enciende VPN si el dispositivo la detecta aunque la IP diga que no", () => {
    // Regresión: con `??` la izquierda `false` tapaba al dispositivo y la señal
    // quedaba apagada pese a una detección afirmativa — un falso negativo justo
    // en la pantalla que existe para detectar fraude.
    const signals = buildSessionSignals(
      summaryWith({
        ipReputation: [ipRep({ isVpn: false })],
        deviceSnapshots: [snapshot({ vpnDetected: true })],
      } as Partial<SessionInvestigationSummary>),
    );
    expect(signal(signals, "VPN").active).toBe(true);
  });

  it("enciende VPN si la IP la detecta aunque el dispositivo diga que no", () => {
    const signals = buildSessionSignals(
      summaryWith({
        ipReputation: [ipRep({ isVpn: true })],
        deviceSnapshots: [snapshot({ vpnDetected: false })],
      } as Partial<SessionInvestigationSummary>),
    );
    expect(signal(signals, "VPN").active).toBe(true);
  });

  it("apaga VPN solo cuando ambas fuentes observaron y ninguna la detectó", () => {
    const signals = buildSessionSignals(
      summaryWith({
        ipReputation: [ipRep({ isVpn: false })],
        deviceSnapshots: [snapshot({ vpnDetected: false })],
      } as Partial<SessionInvestigationSummary>),
    );
    expect(signal(signals, "VPN").active).toBe(false);
  });

  it("cae a la fuente que sí observó cuando la otra no tiene datos", () => {
    const signals = buildSessionSignals(
      summaryWith({
        deviceSnapshots: [snapshot({ vpnDetected: true })],
      } as Partial<SessionInvestigationSummary>),
    );
    expect(signal(signals, "VPN").active).toBe(true);
  });
});

describe("countActiveSignals", () => {
  it("cuenta solo las encendidas y no confunde null con encendida", () => {
    const signals = buildSessionSignals(
      summaryWith({
        ipReputation: [ipRep({ isTor: true, isProxy: false })],
      } as Partial<SessionInvestigationSummary>),
    );
    // Tor encendida; Proxy observada y negativa; VPN/root/emulador sin datos.
    expect(countActiveSignals(signals)).toBe(1);
  });

  it("devuelve cero cuando no hay telemetría", () => {
    expect(countActiveSignals(buildSessionSignals(summaryWith()))).toBe(0);
  });
});

describe("contadores de autenticación y permisos", () => {
  it("cuenta los logins fallidos sin contar los que no se observaron", () => {
    const summary = summaryWith({
      authEvents: [
        {
          id: "1",
          eventType: "login",
          loginSuccessful: false,
          occurredAt: null,
        },
        {
          id: "2",
          eventType: "login",
          loginSuccessful: true,
          occurredAt: null,
        },
        {
          id: "3",
          eventType: "login",
          loginSuccessful: null,
          occurredAt: null,
        },
      ],
    } as Partial<SessionInvestigationSummary>);

    expect(countFailedAuthEvents(summary)).toBe(1);
  });

  it("cuenta los permisos denegados sin contar los que no respondieron", () => {
    const summary = summaryWith({
      permissions: [
        { id: "1", permissionCode: "gps", granted: false, respondedAt: null },
        { id: "2", permissionCode: "sms", granted: true, respondedAt: null },
        { id: "3", permissionCode: "cam", granted: null, respondedAt: null },
      ],
    } as Partial<SessionInvestigationSummary>);

    expect(countDeniedPermissions(summary)).toBe(1);
  });
});

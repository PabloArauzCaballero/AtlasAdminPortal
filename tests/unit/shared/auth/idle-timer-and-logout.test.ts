import { describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import {
  formatCountdown,
  IDLE_LIMIT_MS,
  IDLE_WARNING_MS,
  idlePhase,
  isIdleBroadcast,
  samePhase,
} from "@/shared/auth/idle-timer";
import { revokeOnServer } from "@/shared/auth/logout-on-server";
import {
  consumeLogoutNotice,
  LOGOUT_NOTICE_EVENT,
  markLoggedOutHere,
  setLogoutNotice,
  setStoredInternalSession,
  wasLoggedOutHere,
} from "@/shared/auth/session-storage";
import { makeSession } from "../../../helpers/session-fixtures";

/** ADM-06: cierre por inactividad, logout con reintentos y el aviso en el login. */
describe("idlePhase", () => {
  const t0 = 1_000_000;

  it("activo hasta el minuto 14", () => {
    expect(idlePhase(t0, t0)).toEqual({ kind: "active" });
    expect(idlePhase(t0, t0 + IDLE_WARNING_MS - 1)).toEqual({ kind: "active" });
  });

  it("del minuto 14 al 15 avisa con la cuenta atrás", () => {
    expect(idlePhase(t0, t0 + IDLE_WARNING_MS)).toEqual({
      kind: "warning",
      remainingSeconds: 60,
    });
    expect(idlePhase(t0, t0 + IDLE_LIMIT_MS - 500)).toEqual({
      kind: "warning",
      remainingSeconds: 1,
    });
  });

  it("a los 15 minutos vence", () => {
    expect(idlePhase(t0, t0 + IDLE_LIMIT_MS)).toEqual({ kind: "expired" });
  });

  it("una actividad «del futuro» no da tiempo extra", () => {
    expect(idlePhase(t0 + 5_000, t0)).toEqual({ kind: "active" });
  });

  it("samePhase y formatCountdown", () => {
    expect(samePhase({ kind: "active" }, { kind: "active" })).toBe(true);
    expect(
      samePhase(
        { kind: "warning", remainingSeconds: 3 },
        { kind: "warning", remainingSeconds: 2 },
      ),
    ).toBe(false);
    expect(samePhase({ kind: "active" }, { kind: "expired" })).toBe(false);
    expect(formatCountdown(75)).toBe("1:15");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(-3)).toBe("0:00");
  });

  it("isIdleBroadcast sólo acepta los dos mensajes conocidos", () => {
    expect(isIdleBroadcast({ type: "ACTIVITY", at: 1 })).toBe(true);
    expect(isIdleBroadcast({ type: "IDLE_LOGOUT" })).toBe(true);
    expect(isIdleBroadcast({ type: "ACTIVITY", at: "1" })).toBe(false);
    expect(isIdleBroadcast({ type: "OTRO" })).toBe(false);
    expect(isIdleBroadcast(null)).toBe(false);
    expect(isIdleBroadcast("ACTIVITY")).toBe(false);
  });
});

describe("revokeOnServer", () => {
  it("confirma al primer intento", async () => {
    const revoke = vi.fn().mockResolvedValue({ loggedOut: true });
    await expect(revokeOnServer(revoke, [0, 0])).resolves.toBe(true);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it("reintenta tras un fallo de red y confirma", async () => {
    const revoke = vi
      .fn()
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce({ loggedOut: true });
    await expect(revokeOnServer(revoke, [0, 0])).resolves.toBe(true);
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it("un 401 cuenta como cerrada: la sesión ya no valía", async () => {
    const revoke = vi
      .fn()
      .mockRejectedValue(
        new AtlasApiError({ status: 401, code: "UNAUTHORIZED", message: "x" }),
      );
    await expect(revokeOnServer(revoke, [0, 0])).resolves.toBe(true);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it("si nunca confirma, lo dice tras agotar los intentos", async () => {
    const revoke = vi
      .fn()
      .mockRejectedValue(
        new AtlasApiError({ status: 503, code: "HTTP_503", message: "x" }),
      );
    await expect(revokeOnServer(revoke, [0, 0])).resolves.toBe(false);
    expect(revoke).toHaveBeenCalledTimes(3);
  });
});

describe("session-storage · marca de cierre y aviso", () => {
  it("la marca de «cerró sesión aquí» la borra el siguiente login", () => {
    expect(wasLoggedOutHere()).toBe(false);
    markLoggedOutHere();
    expect(wasLoggedOutHere()).toBe(true);
    setStoredInternalSession(makeSession());
    expect(wasLoggedOutHere()).toBe(false);
  });

  it("el aviso se lee una sola vez y avisa a quien escucha", () => {
    const escucha = vi.fn();
    window.addEventListener(LOGOUT_NOTICE_EVENT, escucha);
    setLogoutNotice({ reason: "idle", serverConfirmed: false });
    window.removeEventListener(LOGOUT_NOTICE_EVENT, escucha);
    expect(escucha).toHaveBeenCalledTimes(1);
    expect(consumeLogoutNotice()).toEqual({
      reason: "idle",
      serverConfirmed: false,
    });
    expect(consumeLogoutNotice()).toBeNull();
  });

  it("un aviso manipulado o ilegible se descarta", () => {
    window.sessionStorage.setItem(
      "atlas_internal_logout_notice",
      JSON.stringify({ reason: "<b>", serverConfirmed: true }),
    );
    expect(consumeLogoutNotice()).toBeNull();
    window.sessionStorage.setItem("atlas_internal_logout_notice", "{roto");
    expect(consumeLogoutNotice()).toBeNull();
  });
});

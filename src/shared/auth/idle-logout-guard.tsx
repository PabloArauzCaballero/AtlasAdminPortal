"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { useAuth } from "./auth-context";
import {
  formatCountdown,
  idlePhase,
  isIdleBroadcast,
  samePhase,
  type IdleBroadcast,
  type IdlePhase,
} from "./idle-timer";

const ACTIVITY_CHANNEL = "atlas_internal_activity";
/** Cada cuánto se avisa a las otras pestañas de que hay actividad aquí. */
const BROADCAST_EVERY_MS = 10_000;
const TICK_MS = 1_000;
const ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

/**
 * Cierre de sesión por inactividad: 15 minutos sin actividad, con aviso al minuto 14 (ADM-06,
 * auditoría 2026-10-09). Antes no existía: un portal abierto en un puesto compartido seguía dentro
 * hasta que caducara el token, y con el refresco silencioso eso era indefinido.
 *
 * - La actividad (ratón, teclado, rueda, toque) de CUALQUIER pestaña del portal cuenta: se reparte
 *   por `BroadcastChannel`, y quien trabaja en una pestaña no pierde la sesión en las otras.
 * - Con el aviso en pantalla, mover el ratón no basta: hay que pulsar «Seguir conectado» (o
 *   Escape). Si no, el aviso parpadearía y desaparecería sin que nadie lo leyera.
 * - Al vencer, la pestaña cierra sesión y avisa a las demás, que cierran también. El login cuenta
 *   por qué (`session-storage.ts`).
 */
export function IdleLogoutGuard() {
  const { logout } = useAuth();
  const titleId = useId();
  const [phase, setPhase] = useState<IdlePhase>({ kind: "active" });
  const lastActivityRef = useRef(Date.now());
  const lastBroadcastRef = useRef(0);
  const warningRef = useRef(false);
  const loggingOutRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const post = useCallback((message: IdleBroadcast) => {
    channelRef.current?.postMessage(message);
  }, []);

  const closeForIdle = useCallback(
    (announce: boolean) => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      if (announce) post({ type: "IDLE_LOGOUT" });
      void logout("idle");
    },
    [logout, post],
  );

  const evaluate = useCallback(() => {
    const next = idlePhase(lastActivityRef.current, Date.now());
    warningRef.current = next.kind === "warning";
    if (next.kind === "expired") {
      closeForIdle(true);
      return;
    }
    setPhase((previous) => (samePhase(previous, next) ? previous : next));
  }, [closeForIdle]);

  const registerActivity = useCallback(
    (at: number, broadcast: boolean) => {
      lastActivityRef.current = Math.max(
        lastActivityRef.current,
        Math.min(at, Date.now()),
      );
      if (broadcast && at - lastBroadcastRef.current >= BROADCAST_EVERY_MS) {
        lastBroadcastRef.current = at;
        post({ type: "ACTIVITY", at });
      }
      evaluate();
    },
    [evaluate, post],
  );

  const stayConnected = useCallback(
    () => registerActivity(Date.now(), true),
    [registerActivity],
  );

  useEffect(() => {
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(ACTIVITY_CHANNEL);
    channelRef.current = channel;
    if (channel) {
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (!isIdleBroadcast(event.data)) return;
        if (event.data.type === "IDLE_LOGOUT") closeForIdle(false);
        else registerActivity(event.data.at, false);
      };
    }

    const onActivity = () => {
      // Con el aviso abierto sólo cuenta el botón: ver el comentario del componente.
      if (warningRef.current) return;
      registerActivity(Date.now(), true);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") evaluate();
    };
    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, {
        passive: true,
        capture: true,
      });
    }
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(evaluate, TICK_MS);

    return () => {
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, onActivity, { capture: true });
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      channel?.close();
      channelRef.current = null;
    };
  }, [closeForIdle, evaluate, registerActivity]);

  const open = phase.kind === "warning";
  return (
    <DialogShell
      open={open}
      labelledBy={titleId}
      onClose={stayConnected}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-md animate-scale-in rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
          <Clock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id={titleId} className="text-base font-semibold text-atlas-text">
            Tu sesión está por cerrarse
          </h2>
          <p className="mt-1 text-sm text-atlas-muted" aria-live="polite">
            Llevas casi 15 minutos sin actividad. Por seguridad, la sesión se
            cierra en{" "}
            <strong className="tabular-nums text-atlas-text">
              {open ? formatCountdown(phase.remainingSeconds) : ""}
            </strong>
            .
          </p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={() => void logout()}>Cerrar sesión ahora</Button>
        <Button variant="primary" onClick={stayConnected}>
          Seguir conectado
        </Button>
      </div>
    </DialogShell>
  );
}

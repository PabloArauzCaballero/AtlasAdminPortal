"use client";

import { useEffect, useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import {
  consumeLogoutNotice,
  LOGOUT_NOTICE_EVENT,
  type LogoutNotice as Notice,
} from "@/shared/auth/session-storage";

/**
 * Por qué se cerró la sesión, contado una vez en el login (ADM-06, auditoría 2026-10-09).
 *
 * Dos cosas que antes no se decían: que la sesión se cerró sola por inactividad, y que el servidor
 * NO confirmó el cierre —la cookie de sesión puede seguir viva hasta caducar, lo que importa en un
 * equipo compartido—. Un cierre normal y confirmado no muestra nada.
 */
export function LogoutNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);

  // Se lee al montar, no al renderizar: el almacenamiento sólo existe en el navegador. Y se escucha:
  // el login se monta en cuanto se borra la sesión local, y el veredicto del servidor (con sus
  // reintentos) puede llegar un par de segundos después.
  useEffect(() => {
    const read = () => {
      const next = consumeLogoutNotice();
      if (next) setNotice(next);
    };
    read();
    window.addEventListener(LOGOUT_NOTICE_EVENT, read);
    return () => window.removeEventListener(LOGOUT_NOTICE_EVENT, read);
  }, []);

  if (!notice) return null;
  if (!notice.serverConfirmed) {
    return (
      <p
        role="alert"
        className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
      >
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          {notice.reason === "idle"
            ? "Cerramos tu sesión por inactividad en este navegador, "
            : "Cerramos tu sesión en este navegador, "}
          pero el servidor no confirmó el cierre. Si el equipo es compartido,
          cierra el navegador por completo o vuelve a entrar y cierra sesión de
          nuevo.
        </span>
      </p>
    );
  }
  if (notice.reason !== "idle") return null;
  return (
    <p
      role="status"
      className="mb-4 flex items-start gap-2 rounded-lg border border-atlas-border bg-atlas-soft p-3 text-sm text-atlas-text"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Cerramos tu sesión tras 15 minutos sin actividad. Vuelve a entrar para
        seguir.
      </span>
    </p>
  );
}

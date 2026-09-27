"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { useChannelIntegrityMutation } from "./hooks";
import type { ChannelIntegrity, SupportCaseChannelRef } from "./types";

/**
 * Comprobar que ninguna conversación del caso se alteró.
 *
 * Cada mensaje lleva el hash del anterior; el servidor los recalcula todos y dice en qué mensaje se
 * rompió la cadena, si se rompió. Se ofrece para TODAS las conversaciones del caso, cerradas
 * incluidas, porque la duda sobre qué se dijo suele llegar cuando la conversación ya terminó.
 */
export function ChannelIntegrityPanel({
  channels,
}: Readonly<{ channels: SupportCaseChannelRef[] }>) {
  if (channels.length === 0) return null;
  return (
    <section className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-atlas-muted">
        Integridad de las conversaciones
      </h2>
      <p className="mb-3 text-xs text-atlas-muted">
        Comprueba que ningún mensaje se cambió ni se borró después de enviarse.
      </p>
      <ul className="space-y-3">
        {channels.map((canal) => (
          <CanalIntegridad key={canal.channelId} canal={canal} />
        ))}
      </ul>
    </section>
  );
}

function CanalIntegridad({
  canal,
}: Readonly<{ canal: SupportCaseChannelRef }>) {
  const comprobar = useChannelIntegrityMutation();
  const [resultado, setResultado] = useState<ChannelIntegrity | null>(null);

  return (
    <li className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-atlas-text">
          Conversación #{canal.channelId}
          <span className="ml-1 text-atlas-muted">· {canal.status}</span>
        </span>
        <Button
          variant="secondary"
          className="h-8 px-2 text-xs"
          isLoading={comprobar.isPending}
          onClick={() =>
            comprobar.mutate(canal.channelId, { onSuccess: setResultado })
          }
        >
          Comprobar
        </Button>
      </div>
      {resultado ? <Veredicto resultado={resultado} /> : null}
      {comprobar.error ? (
        <p className="text-xs text-red-700">
          {isAtlasApiError(comprobar.error)
            ? comprobar.error.message
            : "No se pudo comprobar la conversación."}
        </p>
      ) : null}
    </li>
  );
}

export function Veredicto({
  resultado,
}: Readonly<{ resultado: ChannelIntegrity }>) {
  if (resultado.valid) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
        {resultado.checked === 0
          ? "La conversación no tiene mensajes: no hay nada que alterar."
          : `Intacta: los ${resultado.checked} mensajes cuadran con la cadena.`}
      </p>
    );
  }
  const posiciones = resultado.brokenAt.map((indice) => indice + 1).join(", ");
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-800"
    >
      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
      {`Alterada: la cadena no cuadra en ${resultado.brokenAt.length === 1 ? "el mensaje" : "los mensajes"} ${posiciones} de ${resultado.checked}. Trátalo como un incidente de seguridad y escala el caso.`}
    </p>
  );
}

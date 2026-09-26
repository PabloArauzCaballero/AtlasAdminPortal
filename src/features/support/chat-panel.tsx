"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/input";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import {
  markChannelRead,
  readTranscript,
  sendChannelMessage,
  subscribeToChannel,
} from "./services";
import type { SupportCaseChannelRef, SupportMessage } from "./types";
import { MessagesSquare, WifiOff } from "lucide-react";

/**
 * La conversación, dentro del expediente.
 *
 * Hasta ahora el portal podía TOMAR un chat de la cola y no leerlo: el SSE sólo lo consumía el ERP,
 * así que un agente reclamaba una conversación y tenía que cambiar de herramienta para atenderla.
 * Es el hueco que hacía que la consola sirviera para gestionar el caso pero no para hablar con la
 * persona que lo abrió.
 *
 * Se enseña el canal ABIERTO del caso. Un expediente puede tener varios a lo largo de su vida —una
 * conversación se cierra y más adelante se abre otra sobre el mismo caso— y mezclarlos en un solo
 * hilo daría una transcripción que no corresponde a ninguna sesión real.
 */
export function ChatPanel({
  channels,
}: Readonly<{ channels: SupportCaseChannelRef[] }>) {
  const abierto = channels.find(
    (canal) => !["CLOSED", "ABANDONED"].includes(canal.status),
  );

  if (channels.length === 0) {
    return (
      <Bloque titulo="Conversación">
        <p className="text-sm text-atlas-muted">
          Este caso no tiene ninguna conversación. Se abrió por otra vía —la
          pantalla de casos de la app o del portal de comercio— y se responde
          por el expediente, no por chat.
        </p>
      </Bloque>
    );
  }

  if (!abierto) {
    return (
      <Bloque titulo="Conversación">
        <p className="text-sm text-atlas-muted">
          Las conversaciones de este caso están cerradas. La transcripción queda
          en el expediente; para volver a hablar hace falta que la persona abra
          una nueva.
        </p>
      </Bloque>
    );
  }

  return <Conversacion channelId={abierto.channelId} />;
}

function Conversacion({ channelId }: Readonly<{ channelId: string }>) {
  const queryClient = useQueryClient();
  const [enVivo, setEnVivo] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const transcripcion = useQuery({
    queryKey: queryKeys.supportTranscript(channelId),
    queryFn: () => readTranscript(channelId),
  });

  const refrescar = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.supportTranscript(channelId),
    });
  }, [queryClient, channelId]);

  /*
   * La suscripción se corta al desmontar y al cambiar de canal.
   *
   * Sin el `return`, navegar entre dos casos dejaría el hilo del anterior abierto: seguiría
   * recibiendo mensajes de una conversación que ya nadie mira y cada navegación sumaría otro.
   */
  useEffect(() => {
    return subscribeToChannel(
      channelId,
      (evento) => {
        if (
          evento.type === "message.created" ||
          evento.type === "channel.closed"
        ) {
          refrescar();
        }
      },
      setEnVivo,
    );
  }, [channelId, refrescar]);

  const mensajes = transcripcion.data?.messages ?? [];
  const ultimo = mensajes[mensajes.length - 1];

  /*
   * Marcar leído hasta el último mensaje que de verdad se ha pintado.
   *
   * Se hace aquí y no al abrir la pantalla porque el acuse debe significar «esto se vio», no «esto
   * se pidió»: un `read` disparado antes de que llegue la transcripción le diría a la persona que
   * su mensaje fue leído por alguien que todavía no lo tenía delante.
   */
  useEffect(() => {
    if (!ultimo) return;
    void markChannelRead(channelId, ultimo.sequence).catch(() => undefined);
    finRef.current?.scrollIntoView({ block: "end" });
  }, [channelId, ultimo]);

  const enviar = async () => {
    const cuerpo = texto.trim();
    if (!cuerpo) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await sendChannelMessage(channelId, cuerpo);
      setTexto("");
      refrescar();
    } catch (error) {
      setErrorEnvio(
        isAtlasApiError(error)
          ? error.message
          : "No se pudo enviar el mensaje.",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Bloque
      titulo="Conversación"
      insignia={
        enVivo ? (
          <Badge tone="success" dot>
            En vivo
          </Badge>
        ) : (
          <Badge tone="muted" icon={WifiOff}>
            Reconectando
          </Badge>
        )
      }
    >
      {transcripcion.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {transcripcion.error ? (
        <p className="text-sm text-red-700">
          {isAtlasApiError(transcripcion.error)
            ? transcripcion.error.message
            : "No se pudo cargar la conversación."}
        </p>
      ) : null}

      {transcripcion.data ? (
        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-atlas-border bg-atlas-soft p-3">
          {mensajes.length === 0 ? (
            <p className="text-sm text-atlas-muted">
              La conversación está abierta y todavía no tiene mensajes.
            </p>
          ) : null}
          {mensajes.map((mensaje) => (
            <Mensaje key={mensaje.messageId} mensaje={mensaje} />
          ))}
          <div ref={finRef} />
        </div>
      ) : null}

      <Textarea
        className="min-h-20"
        value={texto}
        placeholder="Escribe tu respuesta…"
        onChange={(event) => setTexto(event.target.value)}
      />
      {errorEnvio ? <p className="text-xs text-red-700">{errorEnvio}</p> : null}
      <Button
        className="w-full"
        variant="primary"
        disabled={texto.trim().length === 0}
        isLoading={enviando}
        onClick={() => void enviar()}
      >
        Enviar
      </Button>
    </Bloque>
  );
}

/**
 * Un mensaje redactado no se pinta vacío.
 *
 * `redacted` significa que el detector de datos sensibles quitó el contenido —un número de tarjeta,
 * un documento— antes de guardarlo. Pintar un globo en blanco haría pensar en un fallo de carga; el
 * dato no está y esa es la información.
 */
function Mensaje({ mensaje }: Readonly<{ mensaje: SupportMessage }>) {
  const deNuestroLado =
    mensaje.senderActorType === "AGENT" ||
    mensaje.senderActorType === "SUPERVISOR";
  const delSistema = mensaje.senderActorType === "SYSTEM";

  return (
    <div className={deNuestroLado ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[85%] rounded-lg border px-3 py-2 text-sm",
          delSistema
            ? "border-slate-200 bg-slate-100 text-atlas-muted"
            : deNuestroLado
              ? "border-atlas-border bg-white text-atlas-text"
              : "border-atlas-info/25 bg-atlas-info/10 text-atlas-text",
        ].join(" ")}
      >
        {mensaje.visibility === "INTERNAL" ? (
          <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-amber-700">
            Nota interna · no la ve el cliente
          </p>
        ) : null}
        {mensaje.redacted ? (
          <p className="italic text-atlas-muted">
            Contenido retirado por contener datos sensibles.
          </p>
        ) : (
          <p className="whitespace-pre-wrap">{mensaje.body}</p>
        )}
        {mensaje.attachments.length > 0 ? (
          <p className="mt-1 text-[0.6875rem] text-atlas-muted">
            {mensaje.attachments.length} adjunto(s)
          </p>
        ) : null}
        <p className="mt-1 text-[0.6875rem] text-atlas-muted">
          {mensaje.senderActorType} · {formatDateTime(mensaje.createdAt)}
        </p>
      </div>
    </div>
  );
}

function Bloque({
  titulo,
  insignia,
  children,
}: Readonly<{
  titulo: string;
  insignia?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <section className="space-y-3 rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-atlas-muted">
          <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
          {titulo}
        </h3>
        {insignia}
      </div>
      {children}
    </section>
  );
}

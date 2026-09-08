"use client";

import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Select } from "@/shared/components/ui/input";
import { EmptyState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { useClaimChannelMutation, useQueuedChannels, useSetPresenceMutation } from "./hooks";
import { MessagesSquare } from "lucide-react";

const PRESENCIAS = ["AVAILABLE", "BUSY", "AWAY", "WRAP_UP", "TRAINING", "OFFLINE"];

/**
 * Las conversaciones que esperan a alguien.
 *
 * Va debajo de la bandeja y no en otra pantalla porque son el mismo trabajo visto por otro lado: un
 * chat en espera es un caso que todavía no tiene quien lo lleve. Separarlos en dos menús es lo que
 * hace que una cola se mire y la otra no.
 *
 * La presencia se declara aquí por la misma razón: el enrutado sólo reserva agentes en
 * `AVAILABLE`, así que un equipo entero en `OFFLINE` produce una cola que crece sin que nadie
 * entienda por qué no se reparte.
 */
export function ChatsEnEspera() {
  const cola = useQueuedChannels();
  const presencia = useSetPresenceMutation();
  const tomar = useClaimChannelMutation();

  if (cola.error) {
    /*
     * Silencio deliberado: si falta el perfil de agente, la bandeja de arriba ya lo explicó con el
     * enlace para arreglarlo. Repetir el mismo aviso dos veces en la misma pantalla no informa más.
     */
    return null;
  }

  const canales = cola.data?.channels ?? [];

  return (
    <section className="mt-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-atlas-muted" aria-hidden />
          <h2 className="text-sm font-semibold text-atlas-text">
            Conversaciones en espera
          </h2>
          <Badge tone={canales.length > 0 ? "warning" : "muted"}>
            {canales.length}
          </Badge>
        </div>
        <label className="flex items-center gap-2 text-xs text-atlas-muted">
          Mi presencia
          <Select
            className="w-40"
            defaultValue="AVAILABLE"
            disabled={presencia.isPending}
            onChange={(event) => presencia.mutate(event.target.value)}
          >
            {PRESENCIAS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {presencia.error && isAtlasApiError(presencia.error) ? (
        <p className="text-xs text-red-700">{presencia.error.message}</p>
      ) : null}

      {canales.length === 0 ? (
        <EmptyState
          title="Nadie está esperando en el chat."
          description="Las conversaciones aparecen aquí en cuanto alguien abre soporte desde la app o desde el portal de comercio y no hay agente disponible que las tome."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {canales.map((canal) => (
            <Card key={canal.channelId}>
              <div className="space-y-2 p-4">
                <p className="font-mono text-xs text-atlas-text">
                  #{canal.channelId}
                </p>
                <p className="text-xs text-atlas-muted">
                  Esperando desde {formatDateTime(canal.requestedAt)}
                </p>
                <p className="text-xs text-atlas-muted">
                  {canal.caseId ? (
                    <>Expediente #{canal.caseId}</>
                  ) : (
                    /*
                     * Un canal sin expediente es el fallo que la fase B2 cerró en el backend: el
                     * chat existía y el caso no, así que la conversación no se podía medir ni
                     * enrutar. Los que quedan son anteriores a ese arreglo.
                     */
                    <span className="text-amber-700">
                      Sin expediente (canal anterior al arreglo)
                    </span>
                  )}
                </p>
                <Button
                  className="h-8 w-full px-2 text-xs"
                  isLoading={tomar.isPending}
                  onClick={() => tomar.mutate(canal.channelId)}
                >
                  Atender
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tomar.error && isAtlasApiError(tomar.error) ? (
        <p className="text-xs text-red-700">{tomar.error.message}</p>
      ) : null}
    </section>
  );
}

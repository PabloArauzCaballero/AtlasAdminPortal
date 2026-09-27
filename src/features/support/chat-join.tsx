"use client";

import { Button } from "@/shared/components/ui/button";
import { isAtlasApiError } from "@/shared/api/errors";
import { useClaimChannelMutation } from "./hooks";

/**
 * Lo que ve un agente que abre la ficha de un chat en el que todavía no está.
 *
 * Leer y escribir exige estar DENTRO de la conversación (participación viva), no sólo tener rol.
 * Antes la ficha pintaba el cuadro de respuesta igual y el agente recibía «Este canal no está
 * abierto para este usuario» al cargar y al enviar, sin ninguna salida. Ahora dice por qué y ofrece
 * la acción que lo arregla: atender si está en espera, tomar el caso si ya lo lleva otra persona.
 */
export function UnirseALaConversacion({
  channelId,
  status,
}: Readonly<{ channelId: string; status: string }>) {
  const tomar = useClaimChannelMutation();
  const enEspera = ["REQUESTED", "QUEUED"].includes(status);

  if (!enEspera) {
    return (
      <p className="text-sm text-atlas-muted">
        Esta conversación la atiende otra persona. Para entrar y responder, usa
        «Tomar» en las acciones del caso: te une al chat y el caso pasa a ser
        tuyo.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-atlas-muted">
        La persona está esperando a que alguien la atienda. Al atenderla entras
        en la conversación y puedes leerla y responder.
      </p>
      <Button
        className="w-full"
        variant="primary"
        isLoading={tomar.isPending}
        onClick={() => tomar.mutate(channelId)}
      >
        Atender esta conversación
      </Button>
      {tomar.error ? (
        <p className="text-xs text-red-700">
          {isAtlasApiError(tomar.error)
            ? tomar.error.message
            : "No se pudo tomar la conversación."}
        </p>
      ) : null}
    </div>
  );
}

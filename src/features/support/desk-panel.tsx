"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { Badge } from "@/shared/components/ui/badges";
import { FieldTooltip } from "@/shared/components/ui/field-tooltip";
import { Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";
import { buildQueueColumns, TIPO_CANAL_OPTIONS } from "./desk-columns";
import {
  useClaimChannelMutation,
  useMyPresence,
  useQueuedChannels,
  useSetPresenceMutation,
} from "./hooks";
import { MisConversaciones } from "./my-conversations";
import { PRESENCIA_OPTIONS } from "./support-options";

const POR_PAGINA = 20;

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
  const router = useRouter();
  const [q, setQ] = useState("");
  const [channelType, setChannelType] = useState("");
  const [page, setPage] = useState(1);
  const cola = useQueuedChannels({
    page,
    limit: POR_PAGINA,
    q: q.trim() || undefined,
    channelType: channelType || undefined,
  });
  const presenciaReal = useMyPresence();
  const presencia = useSetPresenceMutation();
  const tomar = useClaimChannelMutation();
  const { mutate: tomarCanal, isPending: tomando, variables } = tomar;

  const columns = useMemo(
    () =>
      withoutClientSorting(
        buildQueueColumns({
          /*
           * Tomar lleva a la conversación. Antes el botón sólo cambiaba el estado y el chat
           * desaparecía de la lista sin decir dónde había ido: el agente lo tenía y no sabía cómo
           * contestar.
           */
          onAtender: (channelId, caseId) =>
            tomarCanal(channelId, {
              onSuccess: () => {
                if (caseId) router.push(`/internal/support/cases/${caseId}`);
              },
            }),
          tomando: tomando ? (variables ?? null) : null,
        }),
      ),
    [router, tomarCanal, tomando, variables],
  );
  const canales = useMemo(() => cola.data?.channels ?? [], [cola.data]);
  const filtrando = Boolean(q.trim() || channelType);
  const resumen = cola.data?.summary;
  const enEspera = resumen?.total ?? cola.data?.meta?.total ?? canales.length;

  /*
   * Silencio deliberado: si falta el perfil de agente, la bandeja de arriba ya lo explicó con el
   * enlace para arreglarlo. Repetir el mismo aviso dos veces en la misma pantalla no informa más.
   * Cualquier otro fallo sí se dice, con «Reintentar».
   */
  if (cola.error && isAtlasApiError(cola.error) && cola.error.status === 403)
    return null;

  return (
    <>
      <MisConversaciones />
      <section className="mt-8 space-y-3" aria-label="Conversaciones en espera">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-atlas-muted" aria-hidden />
            <h2 className="text-sm font-semibold text-atlas-text">
              Conversaciones en espera
            </h2>
            <Badge tone={enEspera > 0 ? "warning" : "muted"}>{enEspera}</Badge>
            {resumen?.oldestRequestedAt ? (
              <span className="text-xs text-atlas-muted">
                La más antigua espera desde{" "}
                {formatDateTime(resumen.oldestRequestedAt)}
              </span>
            ) : null}
          </div>
          <span className="flex items-center gap-2 text-xs text-atlas-muted">
            Mi presencia
            <Select
              name="presencia"
              ariaLabel="Mi presencia"
              compact
              className="w-40"
              options={PRESENCIA_OPTIONS}
              // La presencia que tiene la base, no una supuesta: mostrar «Disponible» a quien estaba
              // en OFFLINE hacía creer que el reparto le mandaba chats.
              value={
                presencia.variables ??
                presenciaReal.data?.presenceState ??
                "OFFLINE"
              }
              disabled={presencia.isPending || !presenciaReal.data}
              onChange={(valor) => presencia.mutate(valor)}
            />
            <FieldTooltip
              label="Mi presencia"
              text="Decide si el reparto te manda conversaciones nuevas; ponte «Ausente» al salir del puesto."
            />
          </span>
        </div>

        {presencia.error && isAtlasApiError(presencia.error) ? (
          <p className="text-xs text-red-700">{presencia.error.message}</p>
        ) : null}

        <FilterBar
          search={q}
          searchPlaceholder="Buscar por código, n.º de conversación o de expediente…"
          searchTooltip="Busca en el servidor, en toda la cola de espera: coincide con parte del código de la conversación, de su número, del número del expediente o del tipo de canal."
          filters={[
            {
              name: "channelType",
              label: "Canal",
              value: channelType,
              options: TIPO_CANAL_OPTIONS,
              tooltip: "Por dónde entró la conversación que espera.",
            },
          ]}
          onSearchChange={(valor) => {
            setQ(valor);
            setPage(1);
          }}
          onFilterChange={(_nombre, valor) => {
            setChannelType(valor);
            setPage(1);
          }}
          onClear={() => {
            setQ("");
            setChannelType("");
            setPage(1);
          }}
        />
        {cola.isLoading ? <LoadingSkeleton rows={3} /> : null}
        {cola.error ? (
          <ErrorState
            description={
              isAtlasApiError(cola.error)
                ? cola.error.message
                : "No se pudo cargar la cola de espera."
            }
            requestId={
              isAtlasApiError(cola.error) ? cola.error.requestId : undefined
            }
            onRetry={() => void cola.refetch()}
          />
        ) : null}
        {cola.data ? (
          <DataTable
            data={canales}
            columns={columns}
            meta={cola.data.meta}
            onPageChange={setPage}
            emptyTitle={
              filtrando
                ? "Ninguna conversación en espera coincide con la búsqueda."
                : "Nadie está esperando en el chat."
            }
            emptyDescription={
              filtrando
                ? "Cambia o borra el texto y el filtro."
                : "Las conversaciones aparecen aquí en cuanto alguien abre soporte desde la app o desde el portal de comercio y no hay agente disponible que las tome."
            }
          />
        ) : null}

        {tomar.error && isAtlasApiError(tomar.error) ? (
          <p className="text-xs text-red-700">{tomar.error.message}</p>
        ) : null}
      </section>
    </>
  );
}

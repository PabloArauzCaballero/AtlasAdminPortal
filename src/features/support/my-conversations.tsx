"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { Badge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import {
  buildMineColumns,
  ESTADO_MIA_OPTIONS,
  TIPO_CANAL_OPTIONS,
} from "./desk-columns";
import { useMyDesk } from "./hooks";
import { usePageSize } from "@/shared/lib/page-size";

const POR_PAGINA = 20;

/**
 * Las conversaciones que llevo yo.
 *
 * Un chat que el reparto me asignó solo —con mi presencia en «Disponible»— salía de «en espera» y no
 * aparecía en ningún otro sitio: la consola sólo listaba lo que nadie había tomado. Aquí está lo que
 * ya es mío, con el enlace a la ficha donde se contesta.
 *
 * Sin conversaciones mías (según el resumen del servidor, no la página) no se pinta nada: un «no
 * tienes chats» encima de la bandeja es ruido para quien sólo trabaja expedientes. Que un filtro no
 * encuentre nada es otra cosa y sí se dice.
 */
export function MisConversaciones() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [channelType, setChannelType] = useState("");
  const [page, setPage] = useState(1);
  const mia = useMyDesk({
    page,
    limit: usePageSize(POR_PAGINA),
    q: q.trim() || undefined,
    status: status || undefined,
    channelType: channelType || undefined,
  });
  const canales = useMemo(() => mia.data?.channels ?? [], [mia.data]);
  const columns = useMemo(() => withoutClientSorting(buildMineColumns()), []);
  const filtrando = Boolean(q.trim() || status || channelType);
  const total = mia.data?.summary?.total ?? mia.data?.meta?.total ?? 0;

  // Un agente sin perfil recibe 403 aquí; la bandeja de arriba ya lo explicó con el enlace.
  if (mia.error && isAtlasApiError(mia.error) && mia.error.status === 403)
    return null;
  if (mia.isLoading) return <LoadingSkeleton rows={2} />;
  if (mia.data && total === 0 && !filtrando) return null;

  const limpiar = () => {
    setQ("");
    setStatus("");
    setChannelType("");
    setPage(1);
  };

  return (
    <section className="mt-8 space-y-3" aria-label="Mis conversaciones">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-atlas-muted" aria-hidden />
        <h2 className="text-sm font-semibold text-atlas-text">
          Mis conversaciones
        </h2>
        <Badge tone="info">{total}</Badge>
        {mia.data?.summary && mia.data.summary.waitingAgent > 0 ? (
          <Badge tone="warning">
            {mia.data.summary.waitingAgent} esperan tu respuesta
          </Badge>
        ) : null}
      </div>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, n.º de conversación o de expediente…"
        searchTooltip="Busca en el servidor, entre todas tus conversaciones vivas: coincide con parte del código de la conversación, de su número, del número del expediente o del tipo de canal."
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: ESTADO_MIA_OPTIONS,
            tooltip: "En qué punto de la conversación está.",
          },
          {
            name: "channelType",
            label: "Canal",
            value: channelType,
            options: TIPO_CANAL_OPTIONS,
            tooltip: "Por dónde entró la conversación.",
          },
        ]}
        onSearchChange={(valor) => {
          setQ(valor);
          setPage(1);
        }}
        onFilterChange={(nombre, valor) => {
          if (nombre === "status") setStatus(valor);
          if (nombre === "channelType") setChannelType(valor);
          setPage(1);
        }}
        onClear={limpiar}
      />
      {mia.error ? (
        <ErrorState
          description={
            isAtlasApiError(mia.error)
              ? mia.error.message
              : "No se pudieron cargar tus conversaciones."
          }
          requestId={
            isAtlasApiError(mia.error) ? mia.error.requestId : undefined
          }
          onRetry={() => void mia.refetch()}
        />
      ) : null}
      {mia.data ? (
        <DataTable
          data={canales}
          columns={columns}
          meta={mia.data.meta}
          onPageChange={setPage}
          emptyTitle={
            filtrando
              ? "Ninguna de tus conversaciones coincide con la búsqueda."
              : "No llevas ninguna conversación."
          }
          emptyDescription={
            filtrando
              ? "Cambia o borra el texto y los filtros."
              : "Las que tomes o te asigne el reparto aparecerán aquí."
          }
        />
      ) : null}
    </section>
  );
}

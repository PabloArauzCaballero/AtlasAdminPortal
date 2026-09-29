"use client";

import { useMemo, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { AccesoASoporte } from "./support-access-state";
import { buildSupportCaseColumns } from "./case-columns";
import { ChatsEnEspera } from "./desk-panel";
import { SlaSweepButton } from "./sla-sweep-button";
import {
  useSupportCases,
  useSupportCategories,
  useSupportCodes,
  useSupportQueues,
} from "./hooks";
import { codeOptions, queueOptions } from "./support-options";
import {
  ESTADOS_ABIERTOS,
  PRIORIDAD_OPTIONS,
  SOLO_MIOS_OPTIONS,
  TIPO_CASO_OPTIONS,
  TODOS_LOS_ESTADOS,
  VISTAS,
  motivoOptions,
} from "./queue-filters";
import type {
  SupportCase,
  SupportCaseListResponse,
  SupportCursor,
} from "./types";

export { ESTADOS_ABIERTOS } from "./queue-filters";

const POR_PAGINA = 20;

type Filtros = {
  status: string;
  priority: string;
  queueId: string;
  caseType: string;
  categoryCode: string;
  resolutionCode: string;
  rootCauseCode: string;
  asignacion: string;
};

const SIN_FILTROS: Filtros = {
  status: ESTADOS_ABIERTOS,
  priority: "",
  queueId: "",
  caseType: "",
  categoryCode: "",
  resolutionCode: "",
  rootCauseCode: "",
  asignacion: "",
};

export function SupportQueuePage() {
  const [q, setQ] = useState("");
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  /*
   * La paginación es por cursor y hacia adelante: se guarda la PILA de cursores visitados para
   * poder volver. El servidor no devuelve número de página —el backlog crece sin techo y con
   * OFFSET un caso nuevo desplazaría todo lo que el agente está mirando—, así que aquí no hay
   * «página 7 de 12». El TOTAL sí: lo cuenta el servidor en `summary`, sobre el filtro entero.
   */
  const [cursores, setCursores] = useState<SupportCursor[]>([]);
  const cursorActual = cursores[cursores.length - 1] ?? null;

  const colas = useSupportQueues();
  const codigos = useSupportCodes();
  const categorias = useSupportCategories();
  const casos = useSupportCases({
    q: q.trim() || undefined,
    status: filtros.status || TODOS_LOS_ESTADOS,
    priority: filtros.priority || undefined,
    queueId: filtros.queueId || undefined,
    caseType: filtros.caseType || undefined,
    categoryCode: filtros.categoryCode || undefined,
    resolutionCode: filtros.resolutionCode || undefined,
    rootCauseCode: filtros.rootCauseCode || undefined,
    assignedToMe: filtros.asignacion === "mios" || undefined,
    limit: POR_PAGINA,
    cursorOpenedAt: cursorActual?.openedAt,
    cursorId: cursorActual?.id,
  });

  const items = useMemo(() => casos.data?.cases ?? [], [casos.data]);
  const columns = useMemo(() => buildSupportCaseColumns(), []);

  const cambiar = (nombre: string, valor: string) => {
    setFiltros((actual) => ({ ...actual, [nombre]: valor }));
    setCursores([]);
  };

  return (
    <>
      <PageHeader
        icon={LifeBuoy}
        eyebrow="Soporte"
        title="Bandeja de casos"
        description="Los expedientes de soporte que abren clientes y comercios: clasificarlos, atenderlos, resolverlos con código y cerrarlos."
        actions={<SlaSweepButton />}
      />
      <BusinessContextNote>
        Cada fila es un caso real abierto por un cliente o un comercio. Para
        atenderlos hace falta estar en la mesa de soporte: si tu usuario no
        tiene acceso, esta pantalla te lo dice en vez de enseñar una tabla
        vacía. Los casos restringidos sólo los ve un supervisor o el agente que
        los tiene asignados, así que dos personas del mismo equipo pueden ver
        listas distintas aquí, y es correcto.
      </BusinessContextNote>

      <FilterBar
        search={q}
        searchPlaceholder="Buscar por número de caso, asunto o código de cliente…"
        searchTooltip="Busca en el servidor, en toda la bandeja que puedes ver: coincide con parte del número del caso, de su asunto o del código del cliente que lo abrió."
        filters={[
          {
            name: "status",
            label: "Vista",
            allLabel: "Todas las etapas",
            value: filtros.status,
            options: VISTAS,
            tooltip:
              "En qué etapa están los casos que quieres ver; por defecto, todo lo abierto.",
          },
          {
            name: "priority",
            label: "Prioridad",
            value: filtros.priority,
            options: PRIORIDAD_OPTIONS,
            tooltip:
              "Acota a una urgencia; P1 es lo que impide operar al cliente.",
          },
          {
            name: "queueId",
            label: "Cola",
            value: filtros.queueId,
            options: queueOptions(colas.data?.queues ?? [], "queueId"),
            tooltip:
              "Equipo al que pertenecen los casos; sólo ves las colas que tu perfil alcanza.",
          },
          {
            name: "caseType",
            label: "Tipo",
            value: filtros.caseType,
            options: TIPO_CASO_OPTIONS,
            tooltip: "Qué clase de problema es, por ejemplo acceso o pagos.",
          },
          {
            name: "categoryCode",
            label: "Motivo",
            value: filtros.categoryCode,
            options: motivoOptions(categorias.data?.categories ?? []),
            tooltip:
              "El motivo con el que se clasificó el caso, del catálogo de la mesa.",
          },
          {
            name: "resolutionCode",
            label: "Resolución",
            value: filtros.resolutionCode,
            options: codeOptions(codigos.data?.resolutionCodes ?? []),
            tooltip:
              "Cómo se resolvió; sólo aplica a casos resueltos o cerrados.",
          },
          {
            name: "rootCauseCode",
            label: "Causa raíz",
            value: filtros.rootCauseCode,
            options: codeOptions(codigos.data?.rootCauseCodes ?? []),
            tooltip:
              "Por qué pasó el problema; sólo aplica a casos ya resueltos.",
          },
          {
            name: "asignacion",
            label: "Asignación",
            allLabel: "Toda la cola",
            value: filtros.asignacion,
            options: SOLO_MIOS_OPTIONS,
            tooltip: "Si ves toda la cola o sólo lo que tienes asignado tú.",
          },
        ]}
        onSearchChange={(valor) => {
          setQ(valor);
          setCursores([]);
        }}
        onFilterChange={cambiar}
        onClear={() => {
          setQ("");
          setFiltros(SIN_FILTROS);
          setCursores([]);
        }}
      />

      {casos.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {casos.error ? (
        <AccesoASoporte
          error={casos.error}
          onRetry={() => void casos.refetch()}
        />
      ) : null}

      {casos.data ? (
        <div className="space-y-6">
          <ResumenDeLaBandeja datos={casos.data} items={items} />
          <DataTable
            data={items}
            columns={columns}
            emptyTitle="No hay casos para estos filtros."
            emptyDescription="No hay casos que cumplan estos filtros. No es un problema de acceso: prueba con otra vista, otra cola u otra búsqueda."
          />
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              disabled={cursores.length === 0}
              onClick={() => setCursores((pila) => pila.slice(0, -1))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={!casos.data.nextCursor}
              onClick={() =>
                setCursores((pila) =>
                  casos.data?.nextCursor
                    ? [...pila, casos.data.nextCursor]
                    : pila,
                )
              }
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}

      <ChatsEnEspera />
    </>
  );
}

/**
 * Las tres tarjetas salen del `summary` del servidor, que cuenta TODO el filtro. Contra un
 * servidor anterior, que no lo manda, se cuenta la página y la tarjeta lo dice.
 */
function ResumenDeLaBandeja({
  datos,
  items,
}: Readonly<{ datos: SupportCaseListResponse; items: SupportCase[] }>) {
  const resumen = datos.summary;
  const alcance = resumen ? "En toda la vista filtrada." : "En esta página.";
  return (
    <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <MetricCard
        label={resumen ? "Casos en esta vista" : "Casos en esta página"}
        value={formatNumber(resumen ? resumen.total : items.length)}
        hint={
          resumen
            ? "Todos los que cumplen los filtros, no sólo esta página."
            : alcance
        }
      />
      <MetricCard
        label="P1 y P2"
        value={formatNumber(
          resumen
            ? resumen.highPriority
            : items.filter((c) => c.priority === "P1" || c.priority === "P2")
                .length,
        )}
        hint={alcance}
      />
      <MetricCard
        label="Sin agente"
        value={formatNumber(
          resumen
            ? resumen.unassigned
            : items.filter((c) => !c.assigneeAgentId).length,
        )}
        hint={alcance}
      />
    </section>
  );
}

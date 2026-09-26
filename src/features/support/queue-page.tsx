"use client";

import type { Option } from "@/shared/lib/options";
import {
  ASIGNACION_OPTIONS,
  CAUSA_RAIZ_FILTRO_OPTIONS,
  PRIORIDAD_FILTRO_OPTIONS,
  queueOptions,
} from "./support-options";
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Field, Select } from "@/shared/components/ui/input";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { AccesoASoporte } from "./support-access-state";
import { buildSupportCaseColumns } from "./case-columns";
import { ChatsEnEspera } from "./desk-panel";
import { useSupportCases, useSupportQueues } from "./hooks";
import type { SupportCursor } from "./types";
import { LifeBuoy } from "lucide-react";

const ESTADOS_ABIERTOS =
  "NEW,TRIAGED,ASSIGNED,IN_PROGRESS,WAITING_CUSTOMER,WAITING_INTERNAL,WAITING_PARTNER,ESCALATED";

const VISTAS: Option[] = [
  {
    label: "Abiertos (todos)",
    value: ESTADOS_ABIERTOS,
    description: "Todo lo que aún no está resuelto, en cualquier etapa.",
  },
  {
    label: "Sin clasificar",
    value: "NEW",
    description: "Recién llegados: nadie les puso motivo ni prioridad todavía.",
  },
  {
    label: "En curso",
    value: "ASSIGNED,IN_PROGRESS",
    description: "Ya tienen agente y alguien está trabajando en ellos.",
  },
  {
    label: "Esperando a alguien",
    value: "WAITING_CUSTOMER,WAITING_INTERNAL,WAITING_PARTNER",
    description:
      "Parados hasta que responda el cliente, otro equipo o un socio.",
  },
  {
    label: "Escalados",
    value: "ESCALATED",
    description: "Pasados a otro equipo o a un supervisor para decidir.",
  },
  {
    label: "Resueltos y cerrados",
    value: "RESOLVED,CLOSED",
    description: "Terminados; aquí sirve el filtro de causa raíz.",
  },
];

export function SupportQueuePage() {
  const [status, setStatus] = useState(ESTADOS_ABIERTOS);
  const [priority, setPriority] = useState("");
  const [queueId, setQueueId] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [rootCauseCode, setRootCauseCode] = useState("");
  /*
   * La paginación es por cursor y hacia adelante: se guarda la PILA de cursores visitados para
   * poder volver. El backend no devuelve total ni número de página —el backlog crece sin techo y
   * con OFFSET un caso nuevo desplazaría todo lo que el agente está mirando—, así que aquí no hay
   * «página 7 de 12» que enseñar, y fingirla sería mentir sobre lo que el servidor sabe.
   */
  const [cursores, setCursores] = useState<SupportCursor[]>([]);
  const cursorActual = cursores[cursores.length - 1] ?? null;

  const colas = useSupportQueues();
  const casos = useSupportCases({
    status,
    priority: priority || undefined,
    queueId: queueId || undefined,
    assignedToMe: assignedToMe || undefined,
    rootCauseCode: rootCauseCode || undefined,
    limit: 20,
    cursorOpenedAt: cursorActual?.openedAt,
    cursorId: cursorActual?.id,
  });

  const items = useMemo(() => casos.data?.cases ?? [], [casos.data]);
  const columns = useMemo(() => buildSupportCaseColumns(), []);
  const reiniciarPaginacion = () => setCursores([]);

  return (
    <>
      <PageHeader
        icon={LifeBuoy}
        eyebrow="Soporte"
        title="Bandeja de casos"
        description="Los expedientes de soporte que abren clientes y comercios: clasificarlos, atenderlos, resolverlos con código y cerrarlos."
      />
      <BusinessContextNote>
        Cada fila es un expediente real de <code>support.support_cases</code>.
        Atender exige, además del rol interno, un perfil de agente habilitado:
        sin él el backend responde 403 y esta pantalla lo dice explícitamente en
        vez de enseñar una tabla vacía. Los casos marcados como restringidos
        sólo los ve un supervisor o el agente que los tiene asignados, así que
        dos personas del mismo equipo pueden ver cuentas distintas aquí, y es
        correcto.
      </BusinessContextNote>

      <section className="mb-4 grid gap-3 rounded-xl border border-atlas-border bg-white p-3 shadow-subtle sm:grid-cols-2 xl:grid-cols-5">
        <Field
          label="Vista"
          tooltip="En qué etapa están los casos que quieres ver; por defecto, todo lo abierto."
        >
          <Select
            name="vista"
            options={VISTAS}
            value={status}
            onChange={(valor) => {
              setStatus(valor);
              reiniciarPaginacion();
            }}
          />
        </Field>
        <Field
          label="Prioridad"
          tooltip="Acota a una urgencia; P1 es lo que impide operar al cliente."
        >
          <Select
            name="prioridad"
            options={PRIORIDAD_FILTRO_OPTIONS}
            value={priority}
            onChange={(valor) => {
              setPriority(valor);
              reiniciarPaginacion();
            }}
          />
        </Field>
        <Field
          label="Cola"
          tooltip="Equipo al que pertenecen los casos; sólo ves las colas que tu perfil alcanza."
        >
          <Select
            name="cola"
            options={[
              {
                value: "",
                label: "Todas",
                description: "Casos de todas las colas que puedes ver.",
              },
              ...queueOptions(colas.data?.queues ?? [], "queueId"),
            ]}
            value={queueId}
            onChange={(valor) => {
              setQueueId(valor);
              reiniciarPaginacion();
            }}
          />
        </Field>
        <Field
          label="Causa raíz"
          tooltip="Por qué pasó el problema; sirve para ver cuánto viene de defectos propios."
          hint="Sólo aplica a casos ya resueltos: elige la vista «Resueltos y cerrados»."
        >
          <Select
            name="causa-raiz"
            options={CAUSA_RAIZ_FILTRO_OPTIONS}
            value={rootCauseCode}
            onChange={(valor) => {
              setRootCauseCode(valor);
              reiniciarPaginacion();
            }}
          />
        </Field>
        <Field
          label="Asignación"
          tooltip="Si ves toda la cola o sólo lo que tienes asignado tú."
        >
          <Select
            name="asignacion"
            options={ASIGNACION_OPTIONS}
            value={assignedToMe ? "mios" : "todos"}
            onChange={(valor) => {
              setAssignedToMe(valor === "mios");
              reiniciarPaginacion();
            }}
          />
        </Field>
      </section>

      {casos.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {casos.error ? (
        <AccesoASoporte
          error={casos.error}
          onRetry={() => void casos.refetch()}
        />
      ) : null}

      {casos.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <MetricCard
              label="Casos en esta página"
              value={formatNumber(items.length)}
              hint="La cola se pagina por cursor: el backend no devuelve un total."
            />
            <MetricCard
              label="P1 y P2 visibles"
              value={formatNumber(
                items.filter(
                  (caso) => caso.priority === "P1" || caso.priority === "P2",
                ).length,
              )}
            />
            <MetricCard
              label="Sin agente"
              value={formatNumber(
                items.filter((caso) => !caso.assigneeAgentId).length,
              )}
            />
          </section>

          <DataTable
            data={items}
            columns={columns}
            emptyTitle="No hay casos para estos filtros."
            emptyDescription="La respuesta llegó bien y sin casos: esta cola está vacía para el filtro elegido, no es un problema de permisos."
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

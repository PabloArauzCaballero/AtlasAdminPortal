"use client";

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

const VISTAS = [
  { label: "Abiertos (todos)", value: ESTADOS_ABIERTOS },
  { label: "Sin clasificar", value: "NEW" },
  { label: "En curso", value: "ASSIGNED,IN_PROGRESS" },
  { label: "Esperando a alguien", value: "WAITING_CUSTOMER,WAITING_INTERNAL,WAITING_PARTNER" },
  { label: "Escalados", value: "ESCALATED" },
  { label: "Resueltos y cerrados", value: "RESOLVED,CLOSED" },
];

const PRIORIDADES = ["P1", "P2", "P3", "P4"];

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
        Atender exige, además del rol interno, un perfil de agente habilitado: sin
        él el backend responde 403 y esta pantalla lo dice explícitamente en vez
        de enseñar una tabla vacía. Los casos marcados como restringidos sólo los
        ve un supervisor o el agente que los tiene asignados, así que dos personas
        del mismo equipo pueden ver cuentas distintas aquí, y es correcto.
      </BusinessContextNote>

      <section className="mb-4 grid gap-3 rounded-xl border border-atlas-border bg-white p-3 shadow-subtle sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Vista">
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              reiniciarPaginacion();
            }}
          >
            {VISTAS.map((vista) => (
              <option key={vista.value} value={vista.value}>
                {vista.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prioridad">
          <Select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              reiniciarPaginacion();
            }}
          >
            <option value="">Todas</option>
            {PRIORIDADES.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cola">
          <Select
            value={queueId}
            onChange={(event) => {
              setQueueId(event.target.value);
              reiniciarPaginacion();
            }}
          >
            <option value="">Todas</option>
            {(colas.data?.queues ?? []).map((cola) => (
              <option key={cola.queueId} value={cola.queueId}>
                {cola.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Causa raíz"
          hint="Sólo aplica a casos ya resueltos: elige la vista «Resueltos y cerrados»."
        >
          <Select
            value={rootCauseCode}
            onChange={(event) => {
              setRootCauseCode(event.target.value);
              reiniciarPaginacion();
            }}
          >
            <option value="">Cualquiera</option>
            <option value="UNKNOWN">Sin determinar (UNKNOWN)</option>
            <option value="APPLICATION_DEFECT">Defecto de la aplicación</option>
            <option value="THIRD_PARTY">Proveedor externo</option>
            <option value="USER_MISUNDERSTANDING">Malentendido del usuario</option>
          </Select>
        </Field>
        <Field label="Asignación">
          <Select
            value={assignedToMe ? "mios" : "todos"}
            onChange={(event) => {
              setAssignedToMe(event.target.value === "mios");
              reiniciarPaginacion();
            }}
          >
            <option value="todos">Toda la cola</option>
            <option value="mios">Sólo los míos</option>
          </Select>
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
                items.filter((caso) => caso.priority === "P1" || caso.priority === "P2").length,
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
                  casos.data?.nextCursor ? [...pila, casos.data.nextCursor] : pila,
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

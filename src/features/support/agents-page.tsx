"use client";

import {
  CAPACIDAD_OPTIONS,
  CUALQUIER_COLA,
  NIVEL_OPTIONS,
  queueOptions,
} from "./support-options";
import {
  ESTADO_AGENTE_OPTIONS,
  buildAgentColumns,
  filtrarAgentes,
} from "./agent-columns";
import { useMemo, useState } from "react";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Button } from "@/shared/components/ui/button";
import { Field, Select } from "@/shared/components/ui/input";
import { EmptyState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useCreateSupportAgentMutation,
  useDeactivateSupportAgentMutation,
  useSupportAgents,
  useSupportQueues,
} from "./hooks";
import { SelectorUsuarioInterno } from "./internal-user-picker";
import { AccesoASoporte } from "./support-access-state";
import { UserPlus } from "lucide-react";

/**
 * Quién atiende en la mesa.
 *
 * Desde el autoalta del servidor (`support-agent-enrollment.service.ts`), quien tiene el rol de
 * soporte o uno de administración (SUPER_ADMIN, SYSTEMS_ADMIN, INTERNAL_IDENTITY_ADMIN) recibe su
 * perfil de agente solo la primera vez que entra en la mesa. Esta pantalla queda para lo que el
 * autoalta no hace: habilitar a alguien sin esos roles, ajustar nivel y capacidad, dar de baja, y
 * reactivar a quien se dio de baja (el autoalta respeta la baja y no lo recrea).
 *
 * Sólo la ven `admin` y `platform_admin` en el backend: habilitar agentes decide quién puede LEER
 * expedientes de soporte, y dentro de un expediente está la conversación completa con el cliente.
 */
export function SupportAgentsPage() {
  const agentes = useSupportAgents();
  const colas = useSupportQueues();
  const crear = useCreateSupportAgentMutation();
  const dardebaja = useDeactivateSupportAgentMutation();

  const [internalUserId, setInternalUserId] = useState("");
  const [supportLevel, setSupportLevel] = useState("L1");
  const [queueCode, setQueueCode] = useState("");
  const [maxConcurrentChannels, setMaxConcurrentChannels] = useState("3");

  const listo = /^[1-9][0-9]*$/.test(internalUserId.trim());
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [nivel, setNivel] = useState("");
  const visibles = useMemo(
    () => filtrarAgentes(agentes.data?.agents ?? [], { q, estado, nivel }),
    [agentes.data, q, estado, nivel],
  );
  const columnas = useMemo(
    () =>
      buildAgentColumns({
        onQuitar: (id) => dardebaja.mutate(id),
        quitando: dardebaja.variables ?? null,
        ocupado: dardebaja.isPending,
      }),
    [dardebaja],
  );
  const yaEnLaMesa = useMemo(
    () =>
      new Set(
        (agentes.data?.agents ?? [])
          .filter((agente) => agente.isActive)
          .map((agente) => agente.internalUserId),
      ),
    [agentes.data],
  );

  return (
    <>
      <PageHeader
        icon={UserPlus}
        eyebrow="Soporte"
        title="Agentes de la mesa"
        description="Quién está habilitado para atender casos de soporte, con qué nivel, en qué cola y con cuánta capacidad."
      />
      <BusinessContextNote>
        Quien tiene el rol de soporte o de administración entra en la mesa solo:
        su perfil de agente se crea la primera vez que abre esta sección. Aquí
        se habilita a otras personas, se ajusta su nivel y capacidad, y se da de
        baja o se reactiva a alguien. Dar de baja no borra su historia: apaga el
        perfil y libera su capacidad, y los casos y eventos que atendió siguen a
        su nombre. Una baja se respeta aunque la persona conserve su rol: sólo
        vuelve si alguien la reactiva desde aquí.
      </BusinessContextNote>

      <section className="mb-6 rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-atlas-muted">
          Habilitar a una persona
        </h2>
        <form
          noValidate
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!listo) return;
            crear.mutate(
              {
                internalUserId: internalUserId.trim(),
                supportLevel,
                queueCode: queueCode || undefined,
                maxConcurrentChannels: Number(maxConcurrentChannels),
              },
              { onSuccess: () => setInternalUserId("") },
            );
          }}
        >
          <SelectorUsuarioInterno
            value={internalUserId}
            onChange={setInternalUserId}
            yaEnLaMesa={yaEnLaMesa}
          />
          <Field
            label="Nivel"
            tooltip="Qué casos puede ver y a quién le llegan sus escalados; decide su alcance en la mesa."
          >
            <Select
              name="nivel"
              options={NIVEL_OPTIONS}
              value={supportLevel}
              onChange={setSupportLevel}
            />
          </Field>
          <Field
            label="Cola por defecto"
            tooltip="Cola de la que le llega trabajo primero; «Cualquiera» lo deja en el reparto general."
          >
            <Select
              name="cola-defecto"
              options={[
                CUALQUIER_COLA,
                ...queueOptions(colas.data?.queues ?? [], "queueCode"),
              ]}
              value={queueCode}
              onChange={setQueueCode}
            />
          </Field>
          <Field
            label="Chats simultáneos"
            tooltip="Cuántas conversaciones puede llevar a la vez antes de que el reparto lo salte."
            hint="Capacidad real: de esto depende el reparto."
          >
            <Select
              name="chats-simultaneos"
              options={CAPACIDAD_OPTIONS}
              value={maxConcurrentChannels}
              onChange={setMaxConcurrentChannels}
            />
          </Field>
          <div className="flex items-end">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!listo}
              isLoading={crear.isPending}
            >
              Habilitar
            </Button>
          </div>
        </form>

        {crear.error && isAtlasApiError(crear.error) ? (
          <p className="mt-3 text-xs text-red-700">{crear.error.message}</p>
        ) : null}
        {crear.data ? (
          <p className="mt-3 text-xs text-emerald-700">
            {crear.data.reactivated
              ? `Perfil #${crear.data.agentProfileId} reactivado: esta persona ya había estado en la mesa y conserva su historia.`
              : `Perfil #${crear.data.agentProfileId} creado.`}
          </p>
        ) : null}
      </section>

      <FilterBar
        search={q}
        searchPlaceholder="Buscar por nombre o correo…"
        searchTooltip="La lista de la mesa llega completa del servidor (todos los agentes, sin páginas), así que la búsqueda recorre a todos: coincide con parte del nombre o del correo."
        filters={[
          {
            name: "estado",
            label: "Estado",
            value: estado,
            options: ESTADO_AGENTE_OPTIONS,
            tooltip: "Deja sólo los perfiles activos o sólo los dados de baja.",
          },
          {
            name: "nivel",
            label: "Nivel",
            value: nivel,
            options: NIVEL_OPTIONS,
            tooltip: "Deja sólo a quien atiende en esa línea de la mesa.",
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(nombre, valor) => {
          if (nombre === "estado") setEstado(valor);
          if (nombre === "nivel") setNivel(valor);
        }}
        onClear={() => {
          setQ("");
          setEstado("");
          setNivel("");
        }}
      />

      {agentes.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {agentes.error ? (
        <AccesoASoporte
          error={agentes.error}
          onRetry={() => void agentes.refetch()}
        />
      ) : null}

      {agentes.data && agentes.data.agents.length === 0 ? (
        <EmptyState
          title="No hay ningún agente habilitado."
          description="Nadie ha entrado todavía en la mesa. Quien tenga rol de soporte o de administración aparecerá aquí al abrir la bandeja; mientras tanto, las conversaciones de los clientes esperan porque sólo se reparten a agentes activos y disponibles."
        />
      ) : null}

      {agentes.data && agentes.data.agents.length > 0 ? (
        <DataTable
          data={visibles}
          columns={columnas}
          emptyTitle="Ningún agente coincide con estos filtros."
          emptyDescription="Prueba con otro nombre o quita los filtros de estado y nivel."
        />
      ) : null}

      {dardebaja.error && isAtlasApiError(dardebaja.error) ? (
        <p className="mt-3 text-xs text-red-700">{dardebaja.error.message}</p>
      ) : null}
    </>
  );
}

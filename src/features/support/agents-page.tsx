"use client";

import { useState } from "react";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { EmptyState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useCreateSupportAgentMutation,
  useDeactivateSupportAgentMutation,
  useSupportAgents,
  useSupportQueues,
} from "./hooks";
import { AccesoASoporte } from "./support-access-state";
import { UserPlus } from "lucide-react";

const NIVELES = ["L1", "L2", "SPECIALIST", "SUPERVISOR", "MANAGER"];

/**
 * La pantalla que faltaba en todo el circuito.
 *
 * `support.support_agent_profiles` no la escribía ningún endpoint: el rol interno abre las rutas de
 * soporte, pero atender exige perfil, y crearlo era escribir SQL a mano contra la base. El síntoma
 * era una bandeja que respondía 403 a un administrador con todos los permisos.
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

  return (
    <>
      <PageHeader
        icon={UserPlus}
        eyebrow="Soporte"
        title="Agentes de la mesa"
        description="Quién está habilitado para atender casos de soporte, con qué nivel, en qué cola y con cuánta capacidad."
      />
      <BusinessContextNote>
        Tener rol interno no basta para atender: hace falta un perfil de agente.
        Sin él, toda la sección de soporte responde 403{" "}
        <code>SUPPORT_AGENT_PROFILE_REQUIRED</code>, también a un administrador.
        Dar de baja a alguien no borra su historia: apaga el perfil y libera su
        capacidad, y las asignaciones y eventos ya escritos siguen apuntando al
        mismo identificador, que es lo que permite auditar después quién atendió
        qué.
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
          <Field
            label="ID de usuario interno"
            hint="El identificador de iam.internal_users, no el correo."
          >
            <Input
              value={internalUserId}
              inputMode="numeric"
              placeholder="Ej: 3"
              onChange={(event) => setInternalUserId(event.target.value)}
            />
          </Field>
          <Field label="Nivel">
            <Select
              value={supportLevel}
              onChange={(event) => setSupportLevel(event.target.value)}
            >
              {NIVELES.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cola por defecto">
            <Select
              value={queueCode}
              onChange={(event) => setQueueCode(event.target.value)}
            >
              <option value="">Cualquiera</option>
              {(colas.data?.queues ?? []).map((cola) => (
                <option key={cola.queueCode} value={cola.queueCode}>
                  {cola.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Chats simultáneos"
            hint="Capacidad real: de esto depende el reparto."
          >
            <Select
              value={maxConcurrentChannels}
              onChange={(event) => setMaxConcurrentChannels(event.target.value)}
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((valor) => (
                <option key={valor} value={String(valor)}>
                  {valor}
                </option>
              ))}
            </Select>
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
          description="Mientras la mesa esté vacía, la bandeja de soporte responde 403 a todo el mundo y ninguna conversación se reparte: el enrutado sólo reserva agentes con perfil activo y presencia AVAILABLE."
        />
      ) : null}

      {agentes.data && agentes.data.agents.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {agentes.data.agents.map((agente) => (
            <article
              key={agente.agentProfileId}
              className="space-y-2 rounded-xl border border-atlas-border bg-white p-4 shadow-subtle"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-atlas-text">
                    {agente.fullName ??
                      `Usuario interno #${agente.internalUserId}`}
                  </p>
                  <p className="truncate text-xs text-atlas-muted">
                    {agente.email ?? "Sin correo registrado"}
                  </p>
                </div>
                <Badge tone={agente.isActive ? "success" : "muted"}>
                  {agente.isActive ? "Activo" : "Dado de baja"}
                </Badge>
              </div>
              <p className="text-xs text-atlas-muted">
                Nivel {agente.supportLevel} · presencia {agente.presenceState}
              </p>
              <p className="text-xs text-atlas-muted">
                Ocupación {agente.activeChannelCount} de{" "}
                {agente.maxConcurrentChannels} chats
              </p>
              {agente.isActive ? (
                <Button
                  className="h-8 w-full px-2 text-xs"
                  isLoading={dardebaja.isPending}
                  onClick={() => dardebaja.mutate(agente.agentProfileId)}
                >
                  Quitar de la mesa
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {dardebaja.error && isAtlasApiError(dardebaja.error) ? (
        <p className="mt-3 text-xs text-red-700">{dardebaja.error.message}</p>
      ) : null}
    </>
  );
}

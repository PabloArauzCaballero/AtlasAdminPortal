"use client";

import { queueOptions, TIPO_ESCALADO_OPTIONS } from "./support-options";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useClaimCaseMutation,
  useCloseCaseMutation,
  useEscalateCaseMutation,
  useInternalNoteMutation,
  useSupportQueues,
  useTransferCaseMutation,
} from "./hooks";
import { ResolveDialog } from "./resolve-dialog";
import { TriageDialog } from "./triage-dialog";
import type { SupportCase } from "./types";

/**
 * Reclamar no pregunta la razón: la razón es el propio gesto.
 *
 * El backend exige `reason` en toda asignación porque transferir SÍ necesita explicación, pero
 * obligar a escribir «lo tomo yo» antes de tomar un caso añade un paso a la acción más frecuente de
 * la mesa sin añadir información a la historia. Transferir y escalar sí la piden.
 */
const RAZON_RECLAMO = "El agente toma el caso desde la bandeja";

/**
 * El panel de acciones del expediente.
 *
 * Cada acción exige una razón porque cada una escribe un evento en la cadena de hash del caso: la
 * historia se audita, y un movimiento sin motivo es exactamente lo que después nadie sabe explicar.
 * El backend pide mínimo 4 caracteres —10 en el escalado— y aquí se refleja para no gastar un viaje
 * en descubrirlo.
 */
export function CaseActions({ caso }: Readonly<{ caso: SupportCase }>) {
  const [abierto, setAbierto] = useState<"triage" | "resolve" | null>(null);
  const colas = useSupportQueues();
  const reclamar = useClaimCaseMutation(caso.caseId);
  const transferir = useTransferCaseMutation(caso.caseId);
  const escalar = useEscalateCaseMutation(caso.caseId);
  const nota = useInternalNoteMutation(caso.caseId);
  const cerrar = useCloseCaseMutation(caso.caseId);

  const [colaDestino, setColaDestino] = useState("");
  const [razonTransferencia, setRazonTransferencia] = useState("");
  const [tipoEscalado, setTipoEscalado] = useState(
    TIPO_ESCALADO_OPTIONS[0].value,
  );
  const [razonEscalado, setRazonEscalado] = useState("");
  const [textoNota, setTextoNota] = useState("");
  const [razonCierre, setRazonCierre] = useState("");

  const resuelto = caso.internalStatus === "RESOLVED";
  const cerrado = caso.internalStatus === "CLOSED";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={cerrado}
          onClick={() => setAbierto("triage")}
        >
          Clasificar
        </Button>
        <Button
          disabled={cerrado || resuelto}
          isLoading={reclamar.isPending}
          onClick={() => reclamar.mutate({ reason: RAZON_RECLAMO })}
        >
          Reclamar
        </Button>
        <Button
          variant="primary"
          disabled={cerrado || resuelto}
          onClick={() => setAbierto("resolve")}
        >
          Resolver
        </Button>
      </div>

      <Bloque
        titulo="Transferir a otra cola"
        error={transferir.error}
        deshabilitado={cerrado}
        listo={razonTransferencia.trim().length >= 4 && Boolean(colaDestino)}
        cargando={transferir.isPending}
        etiquetaAccion="Transferir"
        onAceptar={() =>
          transferir.mutate({
            queueCode: colaDestino,
            reason: razonTransferencia.trim(),
          })
        }
      >
        <Field
          label="Cola destino"
          tooltip="Equipo que pasará a atender el caso; el agente actual deja de tenerlo."
        >
          <Select
            name="cola-destino"
            placeholder="Elegir…"
            options={queueOptions(colas.data?.queues ?? [], "queueCode")}
            value={colaDestino}
            onChange={setColaDestino}
          />
        </Field>
        <Field
          label="Razón"
          tooltip="Por qué lo pasas a otra cola; lo leerá quien lo reciba antes de abrirlo."
          hint="Mínimo 4 caracteres."
        >
          <Textarea
            className="min-h-16"
            value={razonTransferencia}
            onChange={(event) => setRazonTransferencia(event.target.value)}
          />
        </Field>
      </Bloque>

      <Bloque
        titulo="Escalar"
        error={escalar.error}
        deshabilitado={cerrado}
        listo={razonEscalado.trim().length >= 10}
        cargando={escalar.isPending}
        etiquetaAccion="Escalar"
        onAceptar={() =>
          escalar.mutate({
            escalationType: tipoEscalado as "FUNCTIONAL",
            reason: razonEscalado.trim(),
          })
        }
      >
        <Field
          label="Tipo"
          tooltip="A quién hace falta: otro equipo, un supervisor, o seguridad, fraude o privacidad."
        >
          <Select
            name="tipo-escalado"
            options={TIPO_ESCALADO_OPTIONS}
            value={tipoEscalado}
            onChange={setTipoEscalado}
          />
        </Field>
        <Field
          label="Razón"
          tooltip="Qué necesitas de quien recibe el escalado y qué ya intentaste."
          hint="Mínimo 10 caracteres: el escalado avisa al cliente."
        >
          <Textarea
            className="min-h-16"
            value={razonEscalado}
            onChange={(event) => setRazonEscalado(event.target.value)}
          />
        </Field>
      </Bloque>

      <Bloque
        titulo="Nota interna"
        error={nota.error}
        deshabilitado={cerrado}
        listo={textoNota.trim().length >= 2}
        cargando={nota.isPending}
        etiquetaAccion="Añadir nota"
        onAceptar={() =>
          nota.mutate(textoNota.trim(), { onSuccess: () => setTextoNota("") })
        }
      >
        <Field
          label="Texto"
          tooltip="Lo que el siguiente agente debe saber del caso; queda con tu nombre y hora."
          hint="No lo ve el cliente. Queda en la transcripción como nota interna."
        >
          <Textarea
            className="min-h-20"
            value={textoNota}
            onChange={(event) => setTextoNota(event.target.value)}
          />
        </Field>
      </Bloque>

      <Bloque
        titulo="Cerrar"
        error={cerrar.error}
        deshabilitado={cerrado}
        listo={razonCierre.trim().length >= 4}
        cargando={cerrar.isPending}
        etiquetaAccion="Cerrar caso"
        onAceptar={() => cerrar.mutate({ reason: razonCierre.trim() })}
      >
        <Field
          label="Razón del cierre"
          tooltip="Por qué se cierra sin resolver, p. ej. el cliente dejó de responder."
          hint="Cerrar no sustituye a resolver: un caso cerrado sin resolución queda sin causa ni respuesta comunicada."
        >
          <Textarea
            className="min-h-16"
            value={razonCierre}
            onChange={(event) => setRazonCierre(event.target.value)}
          />
        </Field>
      </Bloque>

      {abierto === "triage" ? (
        <TriageDialog caseId={caso.caseId} onClose={() => setAbierto(null)} />
      ) : null}
      {abierto === "resolve" ? (
        <ResolveDialog caseId={caso.caseId} onClose={() => setAbierto(null)} />
      ) : null}
    </div>
  );
}

function Bloque({
  titulo,
  children,
  error,
  listo,
  cargando,
  deshabilitado,
  etiquetaAccion,
  onAceptar,
}: Readonly<{
  titulo: string;
  children: React.ReactNode;
  error: unknown;
  listo: boolean;
  cargando: boolean;
  deshabilitado: boolean;
  etiquetaAccion: string;
  onAceptar: () => void;
}>) {
  return (
    <section className="space-y-3 rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-atlas-muted">
        {titulo}
      </h3>
      {children}
      {error && isAtlasApiError(error) ? (
        <p className="text-xs text-red-700">{error.message}</p>
      ) : null}
      <Button
        className="w-full"
        disabled={deshabilitado || !listo}
        isLoading={cargando}
        onClick={onAceptar}
      >
        {etiquetaAccion}
      </Button>
    </section>
  );
}

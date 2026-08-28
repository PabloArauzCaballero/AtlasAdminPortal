"use client";

import { useId, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { usePublishEventMutation } from "./hooks";
import type { DomainEventDefinition } from "./types";

/**
 * Publicar un evento a mano.
 *
 * Existe para lo que no se puede arreglar reintentando: cuando un módulo dejó de publicar algo que
 * ya ocurrió, un operador tiene que poder inyectarlo en el outbox. Por eso el código de evento se
 * elige del CATÁLOGO y no se teclea: un código libre entra en la tabla y no lo consume ningún
 * suscriptor, que es un evento perdido con aspecto de evento publicado.
 *
 * La llave de idempotencia se genera aquí, una por envío. Es lo que hace que reintentar el
 * formulario tras un error de red no duplique el efecto.
 */
export function PublishEventDialog({
  open,
  definiciones,
  onClose,
}: Readonly<{
  open: boolean;
  definiciones: DomainEventDefinition[];
  onClose: () => void;
}>) {
  const titleId = useId();
  const publicar = usePublishEventMutation();
  const [eventCode, setEventCode] = useState("");
  const [aggregateType, setAggregateType] = useState("");
  const [aggregateId, setAggregateId] = useState("");
  const [payload, setPayload] = useState("{}");
  const [errorPayload, setErrorPayload] = useState<string | null>(null);

  if (!open) return null;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    let cuerpo: unknown;
    try {
      cuerpo = JSON.parse(payload || "{}");
    } catch {
      setErrorPayload("El payload no es JSON válido.");
      return;
    }
    setErrorPayload(null);
    await publicar.mutateAsync({
      body: {
        eventCode,
        aggregateType,
        ...(aggregateId ? { aggregateId } : {}),
        payload: cuerpo,
      },
      idempotencyKey: globalThis.crypto.randomUUID(),
    });
    onClose();
  }

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onClose}
      overlayClassName="z-50 flex items-center justify-center bg-slate-950/40 p-4"
      panelClassName="w-full max-w-2xl rounded-lg border border-atlas-border bg-white p-5 shadow-subtle"
    >
      <form onSubmit={(evento) => void enviar(evento)} className="space-y-4">
        <h2 id={titleId} className="text-lg font-semibold text-atlas-text">
          Publicar un evento de dominio
        </h2>
        <p className="text-sm text-atlas-muted">
          El evento entra en el outbox y lo consumirán sus suscriptores como si lo hubiera publicado
          el módulo de origen. Queda auditado con el usuario que lo publicó.
        </p>

        <Field
          label="Código de evento"
          hint="Sale del catálogo registrado: un código libre no lo consume ningún suscriptor."
        >
          <Select
            required
            value={eventCode}
            onChange={(evento) => setEventCode(evento.target.value)}
          >
            <option value="">— Elige un evento —</option>
            {definiciones.map((definicion) => (
              <option key={definicion.eventCode} value={definicion.eventCode}>
                {definicion.eventCode}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tipo de agregado" hint="Sobre qué entidad ocurre: customer, loan, partner…">
            <Input
              required
              value={aggregateType}
              onChange={(evento) => setAggregateType(evento.target.value)}
            />
          </Field>
          <Field label="Id del agregado" hint="Opcional: el identificador concreto.">
            <Input
              value={aggregateId}
              onChange={(evento) => setAggregateId(evento.target.value)}
            />
          </Field>
        </div>

        <Field label="Payload" hint="JSON. Es lo que recibirán los suscriptores." error={errorPayload ?? undefined}>
          <Textarea
            rows={6}
            value={payload}
            onChange={(evento) => setPayload(evento.target.value)}
          />
        </Field>

        {publicar.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {isAtlasApiError(publicar.error)
              ? publicar.error.message
              : "No se pudo publicar el evento."}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={publicar.isPending}>
            Publicar
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}

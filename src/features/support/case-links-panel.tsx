"use client";

import Link from "next/link";
import { useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import type { Option } from "@/shared/lib/options";
import { useLinkCaseMutation } from "./hooks";
import type { SupportCaseLink, SupportCaseLinkType } from "./types";

export const TIPO_ENLACE_OPTIONS: Option[] = [
  {
    value: "DUPLICATE_OF",
    label: "Es duplicado de",
    description:
      "La misma consulta abierta dos veces; se atiende en el otro caso.",
  },
  {
    value: "RELATED_TO",
    label: "Está relacionado con",
    description:
      "Tratan del mismo cliente o tema, pero cada uno sigue su curso.",
  },
  {
    value: "CAUSED_BY",
    label: "Fue causado por",
    description: "El problema de este caso nace de lo que describe el otro.",
  },
  {
    value: "PARENT_OF",
    label: "Agrupa a",
    description: "Este caso es el principal y el otro cuelga de él.",
  },
  {
    value: "CHILD_OF",
    label: "Depende de",
    description: "Este caso cuelga de otro principal que lo agrupa.",
  },
  {
    value: "FOLLOW_UP_OF",
    label: "Es seguimiento de",
    description: "Continúa un caso anterior que ya se resolvió o cerró.",
  },
  {
    value: "PROBLEM_OF",
    label: "Es síntoma del problema",
    description: "El otro caso investiga la causa de fondo que produce este.",
  },
  {
    value: "SECURITY_INCIDENT_OF",
    label: "Es parte del incidente de seguridad",
    description:
      "El otro caso lleva el incidente de seguridad al que pertenece este.",
  },
];

const ETIQUETA = Object.fromEntries(
  TIPO_ENLACE_OPTIONS.map((opcion) => [opcion.value, opcion.label]),
);

/**
 * Los casos vinculados y el formulario para vincular otro.
 *
 * Vincular un duplicado o un incidente mayor es lo que permite contar un problema una sola vez y
 * cerrar sus casos juntos. El vínculo queda en la historia del expediente (`CASE_LINKED`), así que no
 * se borra desde aquí: si fue un error, se deja otra nota explicándolo.
 */
export function CaseLinksPanel({
  caseId,
  links,
}: Readonly<{ caseId: string; links: SupportCaseLink[] }>) {
  const vincular = useLinkCaseMutation(caseId);
  const [otro, setOtro] = useState("");
  const [tipo, setTipo] = useState<string>("RELATED_TO");
  const [nota, setNota] = useState("");
  const otroTexto = otro.trim();
  const otroOk = /^[1-9][0-9]*$/.test(otroTexto) && otroTexto !== caseId;

  return (
    <section className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-atlas-muted">
        Casos vinculados
      </h2>
      {links.length === 0 ? (
        <p className="mb-3 text-sm text-atlas-muted">
          Este caso no está vinculado con ningún otro.
        </p>
      ) : (
        <ul className="mb-3 space-y-2 text-sm">
          {links.map((enlace) => {
            const saliente = enlace.caseId === caseId;
            const otroId = saliente ? enlace.linkedCaseId : enlace.caseId;
            return (
              <li
                key={`${enlace.caseId}-${enlace.linkedCaseId}-${enlace.linkType}`}
              >
                {saliente ? "Este caso" : <CasoEnlace id={otroId} />}{" "}
                <span className="lowercase">
                  {ETIQUETA[enlace.linkType] ?? enlace.linkType}
                </span>{" "}
                {saliente ? <CasoEnlace id={otroId} /> : "este caso"}
                {enlace.note ? (
                  <p className="text-xs text-atlas-muted">{enlace.note}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <form
        noValidate
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!otroOk || vincular.isPending) return;
          vincular.mutate(
            {
              linkedCaseId: otroTexto,
              linkType: tipo as SupportCaseLinkType,
              note: nota.trim() || undefined,
            },
            {
              onSuccess: () => {
                setOtro("");
                setNota("");
              },
            },
          );
        }}
      >
        <Field
          label="Número del otro caso"
          tooltip="El número interno del caso con el que se vincula; aparece bajo el código en la bandeja."
          error={
            otroTexto && !otroOk
              ? "Escribe sólo dígitos y un caso distinto de este."
              : undefined
          }
        >
          <Input
            inputMode="numeric"
            value={otro}
            onChange={(event) => setOtro(event.target.value)}
          />
        </Field>
        <Field
          label="Relación"
          tooltip="Cómo se relaciona este caso con el otro, leído de izquierda a derecha."
        >
          <Select
            name="tipo-enlace"
            options={TIPO_ENLACE_OPTIONS}
            value={tipo}
            onChange={setTipo}
          />
        </Field>
        <Field
          label="Nota"
          tooltip="Por qué los vinculas, para quien lea la historia del expediente más adelante."
          hint="Opcional, hasta 400 caracteres."
        >
          <Input
            maxLength={400}
            value={nota}
            onChange={(event) => setNota(event.target.value)}
          />
        </Field>
        {vincular.error ? (
          <p className="text-xs text-red-700">
            {isAtlasApiError(vincular.error) && vincular.error.status === 404
              ? "No existe un caso con ese número."
              : isAtlasApiError(vincular.error)
                ? vincular.error.message
                : "No se pudo vincular el caso."}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={!otroOk}
          isLoading={vincular.isPending}
        >
          Vincular
        </Button>
      </form>
    </section>
  );
}

function CasoEnlace({ id }: Readonly<{ id: string }>) {
  return (
    <Link
      href={`/internal/support/cases/${id}`}
      className="font-mono text-atlas-accent underline"
    >
      #{id}
    </Link>
  );
}

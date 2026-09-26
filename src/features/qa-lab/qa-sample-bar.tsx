"use client";

import { useMemo, useState } from "react";
import { Dices, FlaskConical, Info } from "lucide-react";
import type { EndpointItem } from "@/features/systems/types";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/cn";
import { FakerError, FAKER_UNAVAILABLE_TEXT } from "./fakers/faker-client";
import { FakerParamsPanel } from "./fakers/faker-params-panel";
import { QaSeedField } from "./fakers/qa-seed-field";
import type { QaTestData } from "./fakers/use-fakers";
import {
  CASE_KINDS,
  generateCases,
  generateLocalValues,
  KIND_INTENT,
  KIND_LABELS,
  KIND_VARIANT,
  type QaCaseKind,
  type QaGeneratedCase,
} from "./qa-case-generator";
import { CheckBox } from "./qa-controls";
import { SampleNotice } from "./qa-sample-notice";
import { contractOf, pathFieldsOf } from "./qa-sample-entries";

export type SampleLoad = {
  kind: QaCaseKind;
  payload: Record<string, unknown>;
  pathParams: Record<string, unknown>;
};

/**
 * «Generar datos de prueba»: casos válidos, en el límite o inválidos a partir del contrato de la
 * operación, con los datos de persona sacados del generador del mock (semilla + parámetros). Si
 * el generador no responde, lo dice y no se inventa nada.
 */
export function QaSampleBar({
  endpoint,
  data,
  onLoad,
}: Readonly<{
  endpoint?: EndpointItem;
  data: QaTestData;
  onLoad: (value: SampleLoad) => void;
}>) {
  const [kind, setKind] = useState<QaCaseKind>("valid");
  const [count, setCount] = useState(3);
  const [includeOptional, setIncludeOptional] = useState(false);
  const [cases, setCases] = useState<QaGeneratedCase[]>([]);
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const contract = useMemo(() => contractOf(endpoint), [endpoint]);
  const pathFields = useMemo(() => pathFieldsOf(endpoint), [endpoint]);
  const canGenerate = contract.fields.length > 0 || pathFields.length > 0;

  function load(item: QaGeneratedCase | undefined, index: number) {
    onLoad({
      kind,
      payload: item?.payload ?? {},
      pathParams: generateLocalValues(pathFields, `${data.seed}:${index}`),
    });
  }

  async function generate() {
    setPending(true);
    setFailure(null);
    try {
      const batch = await data.fetchCases(KIND_VARIANT[kind], count);
      const generated = contract.fields.length
        ? generateCases({
            fields: contract.fields,
            kind,
            count,
            seed: data.seed,
            cases: batch,
            includeOptional,
          })
        : Array.from({ length: count }, (_, index) => ({
            label: `Ruta ${index + 1}`,
            kind,
            mutation: null,
            payload: {},
            unresolved: [],
          }));
      setCases(generated);
      setActive(0);
      load(generated[0], 0);
    } catch (error) {
      setCases([]);
      setFailure(
        error instanceof FakerError ? error.message : FAKER_UNAVAILABLE_TEXT,
      );
    } finally {
      setPending(false);
    }
  }

  function choose(index: number) {
    setActive(index);
    load(cases[index], index);
  }

  const current = cases[active];
  return (
    <section
      className="space-y-3 rounded-xl border border-atlas-accentSoft bg-atlas-accentWash p-3.5"
      data-tutorial-id="qa-lab-sample-bar"
    >
      <header className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-atlas-accent to-atlas-primary text-white">
          <FlaskConical className="h-4 w-4" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-atlas-text">
          Generar datos de prueba
        </p>
        <Badge tone="info" className="ml-auto">
          {contract.fields.length} campos en el contrato
        </Badge>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field
          label="Clase de caso"
          tooltip="Qué clase de datos genera: aceptables, en el borde de lo admitido o que deben rechazarse."
        >
          <Select
            name="clase-caso"
            value={kind}
            onChange={(valor) => setKind(valor as QaCaseKind)}
            options={CASE_KINDS.map((option) => ({
              value: option,
              label: KIND_LABELS[option],
              description: KIND_INTENT[option],
            }))}
          />
        </Field>
        <Field
          label="Casos"
          tooltip="Cuántos casos distintos generar de golpe, entre 1 y 20."
        >
          <Input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(event) =>
              setCount(
                Math.min(20, Math.max(1, Number(event.target.value) || 1)),
              )
            }
          />
        </Field>
        <QaSeedField seed={data.rawSeed} onChange={data.setSeed} />
      </div>

      <FakerParamsPanel data={data} />

      <div className="flex flex-wrap items-center gap-3">
        <CheckBox
          label="Incluir también los campos opcionales"
          checked={includeOptional}
          onChange={setIncludeOptional}
        />
        <Button
          variant="primary"
          disabled={!canGenerate}
          isLoading={pending}
          loadingText="Generando…"
          onClick={() => void generate()}
          data-tutorial-id="qa-lab-generate-cases"
          title={
            canGenerate
              ? undefined
              : "El catálogo no declara qué datos de entrada lleva esta operación."
          }
        >
          <Dices className="h-4 w-4" aria-hidden />
          Generar {count} caso{count === 1 ? "" : "s"}
        </Button>
      </div>

      <SampleNotice
        kind={kind}
        contract={contract}
        canGenerate={canGenerate}
        failure={
          failure ??
          (data.baseCase.error ? messageOf(data.baseCase.error) : null)
        }
      />

      {cases.length > 0 ? (
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Casos generados"
        >
          {cases.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              type="button"
              aria-pressed={index === active}
              onClick={() => choose(index)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                index === active
                  ? "border-atlas-accent bg-white text-atlas-accent shadow-sm"
                  : "border-transparent bg-white/70 text-atlas-muted hover:bg-white",
              )}
            >
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {current?.mutation || current?.unresolved.length ? (
        <p className="flex items-start gap-1.5 text-xs text-atlas-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {current.mutation ? `Caso cargado: ${current.mutation}. ` : ""}
            {current.unresolved.length
              ? `Sin dato generado para: ${current.unresolved.join(", ")}; complétalo a mano.`
              : ""}
          </span>
        </p>
      ) : null}
    </section>
  );
}

function messageOf(error: unknown): string {
  return error instanceof FakerError ? error.message : FAKER_UNAVAILABLE_TEXT;
}

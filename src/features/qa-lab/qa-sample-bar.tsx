"use client";

import { useMemo, useState } from "react";
import { Dices, FlaskConical, Info, TriangleAlert } from "lucide-react";
import type { EndpointItem } from "@/features/systems/types";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/cn";
import { pathParamFields, readContract } from "./contract-fields";
import {
  CASE_KINDS,
  generateCases,
  KIND_INTENT,
  KIND_LABELS,
  type QaCaseKind,
  type QaGeneratedCase,
} from "./qa-case-generator";
import { describeQaSeed, QA_SEED_CATALOG } from "./qa-seed-catalog";

const KIND_TONE: Record<QaCaseKind, "success" | "warning" | "critical"> = {
  valid: "success",
  boundary: "warning",
  invalid: "critical",
};

/**
 * Genera datos de prueba a partir del contrato del endpoint, en vez de dejar seis cajas `{}` vacías
 * que el operador rellena a mano.
 *
 * Es la pieza que el QA Lab del portal no tenía y el del motor de decisión sí. La diferencia
 * práctica: antes, probar un endpoint empezaba por inventarse un payload —lo que hacía que casi
 * nadie probara el caso inválido, porque escribir a mano el payload que FALTA un campo cuesta lo
 * mismo que el válido y parece menos útil—. Con el lote generado, la clase inválida sale gratis y
 * cubre un caso por cada campo obligatorio del contrato.
 */
export function QaSampleBar({
  endpoint,
  onLoad,
}: Readonly<{
  endpoint?: EndpointItem;
  onLoad: (value: {
    payload: Record<string, unknown>;
    pathParams: Record<string, unknown>;
  }) => void;
}>) {
  const [kind, setKind] = useState<QaCaseKind>("valid");
  const [count, setCount] = useState(3);
  const [seed, setSeed] = useState(QA_SEED_CATALOG[0].seed);
  const [cases, setCases] = useState<QaGeneratedCase[]>([]);
  const [active, setActive] = useState(0);
  const [generated, setGenerated] = useState(false);

  const contract = useMemo(
    () => readContract(endpoint?.minPayloadSchema),
    [endpoint?.minPayloadSchema],
  );
  const pathFields = useMemo(
    () => pathParamFields(endpoint?.fullPath ?? endpoint?.routePath),
    [endpoint?.fullPath, endpoint?.routePath],
  );

  const canGenerate = contract.fields.length > 0 || pathFields.length > 0;

  function generate() {
    const batch = generateCases(contract.fields, kind, count, seed);
    const pathBatch = generateCases(
      pathFields,
      "valid",
      Math.max(count, 1),
      seed,
    );
    const merged = batch.length
      ? batch
      : pathBatch.map((item, index) => ({
          ...item,
          label: `Ruta ${index + 1}`,
          payload: {},
        }));
    setCases(merged);
    setActive(0);
    setGenerated(true);
    if (merged.length) {
      onLoad({
        payload: merged[0].payload,
        pathParams: pathBatch[0]?.payload ?? {},
      });
    }
  }

  function choose(index: number) {
    setActive(index);
    const pathBatch = generateCases(
      pathFields,
      "valid",
      Math.max(count, 1),
      seed,
    );
    onLoad({
      payload: cases[index].payload,
      pathParams:
        pathBatch[index % Math.max(pathBatch.length, 1)]?.payload ?? {},
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-atlas-accentSoft bg-atlas-accentWash p-3.5">
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

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Clase de caso">
          <Select
            value={kind}
            onChange={(event) => setKind(event.target.value as QaCaseKind)}
          >
            {CASE_KINDS.map((option) => (
              <option key={option} value={option}>
                {KIND_LABELS[option]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Casos">
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
        <Field label="Semilla">
          <Select
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
          >
            {QA_SEED_CATALOG.map((entry) => (
              <option key={entry.seed} value={entry.seed}>
                {entry.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button
            variant="primary"
            className="w-full"
            disabled={!canGenerate}
            onClick={generate}
            title={
              canGenerate
                ? undefined
                : "Este endpoint no declara contrato de entrada en el catálogo."
            }
          >
            <Dices className="h-4 w-4" aria-hidden />
            Generar {count} caso{count === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      <Notice
        kind={kind}
        contract={contract}
        canGenerate={canGenerate}
        seed={seed}
      />

      {generated && cases.length > 0 ? (
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

      {generated && cases[active]?.mutation ? (
        <p className="flex items-start gap-1.5 text-xs text-atlas-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Caso cargado: {cases[active].mutation}.
        </p>
      ) : null}
    </section>
  );
}

function Notice({
  kind,
  contract,
  canGenerate,
  seed,
}: Readonly<{
  kind: QaCaseKind;
  contract: ReturnType<typeof readContract>;
  canGenerate: boolean;
  seed: string;
}>) {
  /*
   * Un contrato que es sólo un puntero al Zod del backend NO se puede generar, y decirlo con
   * precisión evita la conclusión falsa: el problema no es el endpoint ni el laboratorio, es que el
   * catálogo no publica los campos de ese endpoint.
   */
  if (contract.isReference) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          El catálogo sólo publica una referencia al schema del backend (
          <code className="font-mono">{contract.referenceName}</code>), no sus
          campos: no hay contrato del que derivar valores. Usa el payload de
          ejemplo escrito a mano si existe para esta ruta.
        </span>
      </p>
    );
  }
  if (!canGenerate) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Este endpoint no declara contrato de entrada en el catálogo, así que no
        hay campos que generar. Escribe el payload a mano o registra el
        contrato.
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 text-xs text-atlas-muted">
      <Badge tone={KIND_TONE[kind]}>{KIND_LABELS[kind]}</Badge>
      <span>
        {KIND_INTENT[kind]} {describeQaSeed(seed)} Los valores se derivan del
        contrato publicado, no de las reglas Zod del backend.
      </span>
    </p>
  );
}

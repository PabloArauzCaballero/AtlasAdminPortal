"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { FakerError } from "./faker-client";
import type { FakerParam } from "./faker-types";
import { ADJUSTABLE_FAKER_TYPES, type QaTestData } from "./use-fakers";

/**
 * «Ajustar los datos generados»: los parámetros del generador (edad, departamento, ingresos,
 * riesgo del dispositivo, montos…) pintados a partir del CATÁLOGO que publica el mock. Aquí no hay
 * ningún parámetro escrito a mano: si el mock añade uno, aparece solo.
 */
export function FakerParamsPanel({ data }: Readonly<{ data: QaTestData }>) {
  const [open, setOpen] = useState(false);
  const types = (data.catalog.data?.types ?? []).filter((entry) =>
    (ADJUSTABLE_FAKER_TYPES as readonly string[]).includes(entry.type),
  );
  const error = data.baseCase.error;
  const details = error instanceof FakerError ? error.details : [];
  const touched = Object.keys(data.params).length > 0;

  return (
    <div className="rounded-lg border border-atlas-border bg-white/70">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-atlas-text"
      >
        <span>
          Ajustar los datos generados
          {touched ? (
            <span className="ml-2 font-normal text-atlas-muted">
              (con cambios)
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-atlas-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-atlas-border p-3">
          {data.catalog.isLoading ? (
            <p className="text-xs text-atlas-muted">Cargando parámetros…</p>
          ) : null}
          {types.map((entry) => (
            <fieldset key={entry.type} className="space-y-2">
              <legend className="text-[11px] font-semibold uppercase tracking-wide text-atlas-muted">
                {entry.label}
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {entry.params.map((param) => (
                  <ParamField
                    key={`${entry.type}-${param.name}`}
                    type={entry.type}
                    param={param}
                    value={data.params[entry.type]?.[param.name]}
                    onChange={(value) =>
                      data.setParam(entry.type, param.name, value)
                    }
                  />
                ))}
              </div>
            </fieldset>
          ))}
          {details.length ? (
            <ul className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              {details.map((item) => (
                <li key={`${item.param}-${item.detail}`}>{item.detail}</li>
              ))}
            </ul>
          ) : null}
          {touched ? (
            <Button variant="ghost" onClick={data.resetParams}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Volver a los valores por defecto
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ParamField({
  type,
  param,
  value,
  onChange,
}: Readonly<{
  type: string;
  param: FakerParam;
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
}>) {
  const tooltip =
    param.help ?? `Ajusta «${param.label}» en los datos que se generan.`;
  const current = value ?? param.default ?? "";
  if (param.kind === "enum" && param.options?.length) {
    return (
      <Field label={param.label} tooltip={tooltip}>
        <Select
          name={`faker-${type}-${param.name}`}
          value={String(current)}
          onChange={(next) =>
            onChange(next === param.default ? undefined : next)
          }
          options={param.options.map((option) => ({
            value: option.value,
            label: option.label,
            description: `${param.label}: ${option.label}.`,
          }))}
        />
      </Field>
    );
  }
  const numeric = param.kind === "int" || param.kind === "number";
  return (
    <Field label={param.label} tooltip={tooltip}>
      <Input
        type={numeric ? "number" : param.kind === "date" ? "date" : "text"}
        min={param.min}
        max={param.max}
        value={String(current)}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "" || raw === String(param.default ?? "")) {
            onChange(undefined);
            return;
          }
          onChange(numeric ? Number(raw) : raw);
        }}
      />
    </Field>
  );
}

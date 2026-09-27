"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EndpointItem } from "@/features/systems/types";
import { FakerError, FAKER_UNAVAILABLE_TEXT } from "./fakers/faker-client";
import { resolveFakerTemplate } from "./fakers/faker-template";
import type { QaTestData } from "./fakers/use-fakers";
import { jsonText } from "./json-utils";
import { findPayloadPreset, type QaPayloadPreset } from "./payload-presets";
import { generateCases } from "./qa-case-generator";
import { contractOf, defaultEntries, qaLocalValues } from "./qa-sample-entries";

type EntryForm = {
  payload: string;
  pathParams: string;
  queryParams: string;
  expectedStatusCodes: string;
};

/**
 * Conecta el formulario de una prueba con el generador de datos:
 *
 * - Al abrir una operación, y cada vez que cambia la semilla o un parámetro, rellena los datos de
 *   entrada con el primer caso válido del lote ELEGIDO. Sólo si el operador no los editó a mano:
 *   lo escrito por una persona no se pisa.
 * - Resuelve el ejemplo de la operación (`payload-presets.ts`) contra ese mismo caso.
 * - «Datos inválidos» carga el primer caso inválido del generador.
 */
export function useGeneratedEntries<F extends EntryForm>({
  endpoint,
  data,
  form,
  patchForm,
}: {
  endpoint?: EndpointItem;
  data: QaTestData;
  form: F;
  patchForm: (value: Partial<F>) => void;
}) {
  const lastAuto = useRef<{ payload: string; pathParams: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const context = data.baseCase.data?.[0];
  const preset = findPayloadPreset(
    endpoint?.method ?? "GET",
    endpoint?.fullPath ?? endpoint?.routePath,
  );

  useEffect(() => {
    lastAuto.current = null;
  }, [endpoint]);

  useEffect(() => {
    if (!context) return;
    const untouched =
      lastAuto.current === null ||
      (lastAuto.current.payload === form.payload &&
        lastAuto.current.pathParams === form.pathParams);
    if (!untouched) return;
    const entries = defaultEntries(endpoint, data.seed, context);
    const next = {
      payload: jsonText(entries.payload),
      pathParams: jsonText(entries.pathParams),
    };
    lastAuto.current = next;
    patchForm({
      ...next,
      ...(Object.keys(entries.queryParams).length
        ? { queryParams: jsonText(entries.queryParams) }
        : {}),
    } as Partial<F>);
    // Sólo reacciona a un lote nuevo (semilla/parámetros) o a otra operación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, endpoint, data.seed]);

  const markManual = useCallback(() => {
    lastAuto.current = { payload: "\u0000", pathParams: "\u0000" };
  }, []);

  const applyPreset = useCallback(
    (chosen: QaPayloadPreset | undefined = preset) => {
      if (!chosen) return;
      if (!context) {
        setNotice(FAKER_UNAVAILABLE_TEXT);
        return;
      }
      const local = qaLocalValues(data.seed);
      const resolve = <T>(value: T) =>
        resolveFakerTemplate(value, context, local).value;
      markManual();
      setNotice(null);
      patchForm({
        payload: jsonText(resolve(chosen.payload ?? {})),
        queryParams: jsonText(resolve(chosen.queryParams ?? {})),
        pathParams: jsonText(resolve(chosen.pathParams ?? {})),
        ...(chosen.expectedStatusCodes
          ? { expectedStatusCodes: chosen.expectedStatusCodes }
          : {}),
      } as Partial<F>);
    },
    [preset, context, data.seed, markManual, patchForm],
  );

  const loadInvalidCase = useCallback(async () => {
    const fields = contractOf(endpoint).fields;
    if (!fields.length) {
      setNotice(
        "El catálogo no declara los campos de esta operación: rompe tú una regla en los datos de entrada.",
      );
      return;
    }
    try {
      const batch = await data.fetchCases("invalido", 1);
      const [invalid] = generateCases({
        fields,
        kind: "invalid",
        count: 1,
        seed: data.seed,
        cases: batch,
      });
      markManual();
      setNotice(
        invalid?.mutation
          ? `Caso inválido cargado: ${invalid.mutation}.`
          : null,
      );
      patchForm({ payload: jsonText(invalid?.payload ?? {}) } as Partial<F>);
    } catch (error) {
      setNotice(
        error instanceof FakerError ? error.message : FAKER_UNAVAILABLE_TEXT,
      );
    }
  }, [endpoint, data, markManual, patchForm]);

  return { preset, applyPreset, loadInvalidCase, markManual, notice };
}

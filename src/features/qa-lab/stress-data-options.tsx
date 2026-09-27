"use client";

import { useCallback, useMemo, useState } from "react";
import type { EndpointItem } from "@/features/systems/types";
import type { JsonRecord } from "@/shared/api/types";
import { FakerError, FAKER_UNAVAILABLE_TEXT } from "./fakers/faker-client";
import { FakerParamsPanel } from "./fakers/faker-params-panel";
import { QaSeedField } from "./fakers/qa-seed-field";
import type { QaTestData } from "./fakers/use-fakers";
import { generateCases } from "./qa-case-generator";
import { CheckBox } from "./qa-controls";
import { contractOf } from "./qa-sample-entries";

/** Tope de personas distintas por carga: el máximo que el generador entrega de una vez. */
export const MAX_ROTATION = 200;

type BuildResult =
  { ok: true; value: JsonRecord[] | undefined } | { ok: false; error: string };

/**
 * «Datos distintos por petición»: antes todas las peticiones de una carga llevaban el MISMO
 * cuerpo, así que una operación de alta respondía «ya existe» desde la segunda y la carga medía
 * el rechazo, no el alta. Con esto se pide al generador un lote de hasta 200 personas y cada
 * petición lleva la siguiente, rotando.
 */
export function useStressRotation({
  endpoint,
  data,
}: {
  endpoint?: EndpointItem;
  data: QaTestData;
}) {
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const fields = useMemo(() => contractOf(endpoint).fields, [endpoint]);

  const build = useCallback(
    async (
      maxRequests: number,
      plan: { targetRps: number; durationSeconds: number },
    ): Promise<BuildResult> => {
      if (!enabled || fields.length === 0)
        return { ok: true, value: undefined };
      const planned = Math.max(
        1,
        Math.round(plan.targetRps * plan.durationSeconds),
      );
      const count = Math.max(1, Math.min(MAX_ROTATION, maxRequests, planned));
      setPending(true);
      try {
        const batch = await data.fetchCases("valido", count);
        const payloads = generateCases({
          fields,
          kind: "valid",
          count,
          seed: data.seed,
          cases: batch,
        }).map((item) => item.payload as JsonRecord);
        return { ok: true, value: payloads };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof FakerError
              ? error.message
              : FAKER_UNAVAILABLE_TEXT,
        };
      } finally {
        setPending(false);
      }
    },
    [enabled, fields, data],
  );

  return { enabled, setEnabled, pending, build, canRotate: fields.length > 0 };
}

export function StressDataOptions({
  rotation,
  data,
}: Readonly<{
  rotation: ReturnType<typeof useStressRotation>;
  data: QaTestData;
}>) {
  return (
    <section className="space-y-3 rounded-xl border border-atlas-accentSoft bg-atlas-accentWash p-3.5">
      <p className="text-sm font-semibold text-atlas-text">Datos de la carga</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <QaSeedField
          seed={data.rawSeed}
          onChange={data.setSeed}
          name="semilla-carga"
        />
        <div className="space-y-2">
          <CheckBox
            label="Datos distintos por petición"
            checked={rotation.enabled}
            onChange={rotation.setEnabled}
          />
          <p className="text-xs text-atlas-muted">
            {rotation.canRotate
              ? `Cada petición lleva una persona distinta del lote (hasta ${MAX_ROTATION}, y luego se repiten en orden). Úsalo en operaciones de alta, que rechazan a la misma persona dos veces. Cada petición lleva además su propia clave anti-duplicados.`
              : "El catálogo no declara los campos de esta operación: todas las peticiones llevarán los datos de entrada base."}
          </p>
        </div>
      </div>
      <FakerParamsPanel data={data} />
    </section>
  );
}

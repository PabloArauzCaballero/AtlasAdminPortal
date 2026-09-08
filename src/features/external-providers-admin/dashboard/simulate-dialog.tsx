"use client";

import { useId, useState } from "react";
import { Play, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useTestProviderMutation } from "../hooks";
import { RequestResultCard } from "../request-result-card";
import type { DashboardProvider } from "../types";

/**
 * Escenarios que el emulador entiende, con el nombre de lo que provocan.
 *
 * La lista está aquí y no se pide al emulador porque el portal no lo alcanza: el emulador no
 * tiene dominio público, sólo lo ve el backend desde dentro de la red. Duplicar ocho literales es
 * más barato que abrir un proxy para leerlos.
 */
const ESCENARIOS: Array<{ value: string; label: string; hint: string }> = [
  { value: "", label: "Normal", hint: "El proveedor responde con datos válidos." },
  { value: "provider_down", label: "Proveedor caído", hint: "Contesta 503, como un proveedor fuera de servicio." },
  { value: "timeout", label: "No contesta", hint: "Se queda callado hasta que la llamada se rinde." },
  { value: "slow_response", label: "Lento", hint: "Contesta bien, pero tardísimo. Para ver el p95 subir." },
  { value: "unauthorized", label: "Credencial rechazada", hint: "Contesta 401." },
  { value: "rate_limited", label: "Límite alcanzado", hint: "Contesta 429." },
  { value: "not_found", label: "Sin coincidencia", hint: "El dato consultado no existe en el proveedor." },
  { value: "partial_match", label: "Coincidencia parcial", hint: "Coincide a medias: pide revisión manual." },
  { value: "fraud_signal_high", label: "Señal de fraude", hint: "Devuelve indicadores de riesgo altos." },
];

/**
 * Dispara una llamada REAL contra el proveedor, con el escenario elegido.
 *
 * No simula nada en el navegador: usa el mismo endpoint de prueba del backend que ya existía en
 * el cajón «Gestionar → Probar». La diferencia es que aquí se pide en un clic desde la tarjeta,
 * con los escenarios traducidos, en vez de escribir el nombre del escenario a mano en un campo de
 * texto libre.
 */
export function SimulateDialog({
  provider,
  onClose,
}: Readonly<{ provider: DashboardProvider; onClose: () => void }>) {
  const titleId = useId();
  const [scenario, setScenario] = useState("");
  const test = useTestProviderMutation(provider.providerCode);
  const elegido = ESCENARIOS.find((item) => item.value === scenario);

  return (
    <DialogShell open labelledBy={titleId} onClose={onClose} panelClassName="w-full max-w-xl">
      <div className="max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-atlas-text">
              Simular una llamada a {provider.providerCode}
            </h2>
            <p className="mt-1 text-sm text-atlas-muted">
              Ejecuta una llamada de prueba de verdad y la registra como cualquier otra. Aparecerá en el
              tablero y en el listado de solicitudes.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <Field label="Qué quieres que pase" hint={elegido?.hint}>
          <select
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
            className="h-11 w-full rounded-lg border border-atlas-border bg-white px-3 text-sm text-atlas-text"
          >
            {ESCENARIOS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        {provider.mode !== "mock_server" ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Este proveedor está en modo <strong>{provider.mode}</strong>. Los escenarios los aplica el emulador,
            que sólo interviene en «simulado servidor»: en cualquier otro modo la respuesta la fabrica el propio
            backend y el escenario se ignora en su mayor parte.
          </p>
        ) : null}

        {test.error ? (
          <ErrorState
            title="La llamada falló"
            description={isAtlasApiError(test.error) ? test.error.message : "Error inesperado."}
            requestId={isAtlasApiError(test.error) ? test.error.requestId : undefined}
          />
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            isLoading={test.isPending}
            loadingText="Llamando…"
            onClick={() => test.mutate({ scenario: scenario || undefined, input: {} })}
          >
            <Play className="h-4 w-4" aria-hidden />
            Llamar ahora
          </Button>
        </div>

        {test.data ? (
          <div className="mt-4">
            <RequestResultCard title={`Respuesta de ${provider.providerCode}`} result={test.data} />
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}

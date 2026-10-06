"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { creditErrorMessage } from "./credit-rules";

/**
 * Puntaje y Calificación del cliente, con los MISMOS nombres que ve en la app (2026-10-06):
 *  - Puntaje: puntos ganados pagando a tiempo, 1 por boliviano. Sólo suben.
 *  - Calificación: de 1 a 100, qué tan buen pagador es.
 * Ninguno es el índice 0-1000 del motor (que la línea enseña aparte) ni la categoría de riesgo en letra.
 */
export type PayerScores = {
  customerId: string;
  score: number;
  tier: { label: string; index: number; of: number };
  rating?: { value: number; scale: { min: number; max: number } };
  points?: { value: number; currentStreak: number; bestStreak: number };
  experience: { xp: number; currentStreak: number; bestStreak: number };
};

export function getCustomerPayerScores(customerId: string) {
  return apiRequest<PayerScores>(
    `/customers/${encodeURIComponent(customerId)}/progress`,
  );
}

/** Con un backend anterior que no trae `rating`/`points`, la misma regla que el servidor: 1-100 y los XP. */
export function payerScoresView(data: PayerScores) {
  const calificacion =
    data.rating?.value ??
    Math.min(
      100,
      Math.max(1, Math.round(Number.isFinite(data.score) ? data.score : 1)),
    );
  const puntos = data.points ?? {
    value: data.experience.xp,
    currentStreak: data.experience.currentStreak,
    bestStreak: data.experience.bestStreak,
  };
  return { calificacion, puntos, nivel: data.tier };
}

export function CustomerPayerScores({
  customerId,
}: Readonly<{ customerId: string }>) {
  const query = useQuery({
    queryKey: queryKeys.customerPayerScores(customerId),
    queryFn: () => getCustomerPayerScores(customerId),
    enabled: Boolean(customerId),
  });

  return (
    <div className="space-y-3" data-testid="puntaje-y-calificacion">
      <h3 className="text-sm font-semibold text-atlas-text">
        Puntaje y calificación
      </h3>
      {query.isLoading ? <LoadingSkeleton rows={2} /> : null}
      {query.error ? (
        <ErrorState
          description={creditErrorMessage(
            query.error,
            "No se pudieron cargar el puntaje y la calificación del cliente.",
          )}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data ? <PayerScoresGrid data={query.data} /> : null}
    </div>
  );
}

function PayerScoresGrid({ data }: Readonly<{ data: PayerScores }>) {
  const v = payerScoresView(data);
  return (
    <KeyValueGrid
      items={[
        {
          label: "Puntaje (puntos por pagar a tiempo)",
          value: `${v.puntos.value.toLocaleString("es-BO")} puntos`,
        },
        {
          label: "Racha de pagos a tiempo",
          value: `${v.puntos.currentStreak} (mejor: ${v.puntos.bestStreak})`,
        },
        { label: "Calificación de pagador", value: `${v.calificacion} de 100` },
        {
          label: "Nivel",
          value: `${v.nivel.label} · ${v.nivel.index} de ${v.nivel.of}`,
        },
      ]}
    />
  );
}

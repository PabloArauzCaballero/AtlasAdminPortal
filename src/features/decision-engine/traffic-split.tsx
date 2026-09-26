"use client";

import type { ActiveArtifactTrafficRule } from "@/features/systems/types";
import { Badge } from "@/shared/components/ui/badges";

/**
 * El reparto de tráfico de un despliegue.
 *
 * Sin regla explícita, el despliegue se lleva TODO el tráfico del ambiente — y eso se dice, en vez
 * de dejar la celda vacía: una celda vacía se lee como «no sé», y aquí sí se sabe. Con reglas, la
 * suma se muestra tal cual llega del motor; si no llega al 100 % es información, no un error de
 * presentación, y quien lo vea debe poder notarlo desde la tabla.
 */
export function TrafficSplit({
  rules,
}: Readonly<{ rules: ActiveArtifactTrafficRule[] }>) {
  if (rules.length === 0) {
    return <Badge tone="success">100% del ambiente</Badge>;
  }

  const total = rules.reduce(
    (sum, rule) => sum + (rule.trafficPercentage ?? 0),
    0,
  );

  return (
    <div className="space-y-1">
      {rules.map((rule, index) => (
        <p
          key={`${rule.segmentKey ?? "segmento"}-${index}`}
          className="font-mono text-[11px]"
        >
          {rule.segmentKey ?? "(sin segmento)"}: {rule.trafficPercentage ?? "—"}
          %
        </p>
      ))}
      {total !== 100 ? <Badge tone="warning">Suma {total}%</Badge> : null}
    </div>
  );
}

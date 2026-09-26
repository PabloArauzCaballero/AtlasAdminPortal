"use client";

import Link from "next/link";
import { ExternalLink, Package } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { engineUrl } from "@/shared/decision-engine/engine-links";

/**
 * La ruta sigue existiendo; el editor no.
 *
 * ## Por qué no se borra la ruta
 *
 * Estaba enlazada desde la política actual y desde la documentación interna, y hay gente con el
 * marcador puesto. Un 404 no explica nada: quien llegue aquí buscando editar la política necesita
 * saber DÓNDE se hace ahora, no descubrir que la pantalla desapareció.
 *
 * ## Por qué se quita el editor
 *
 * Creaba versiones de ruleset con el lenguaje de reglas propio de Atlas —un segundo motor de
 * decisión, sin la aprobación, la segregación de funciones ni la auditoría encadenada del Motor—.
 * El endpoint del backend sigue en pie porque las semillas y las pruebas lo usan; lo que se retira
 * es la puerta desde la que cualquiera con acceso al portal escribía política de crédito a mano.
 */
export function RulesetAuthoringMovedPage() {
  const gobierno = engineUrl("/risk-governance");
  const artefactos = engineUrl("/artifacts");

  return (
    <PermissionGate permissions={["operations.riskPolicy.read"]}>
      <PageHeader
        icon={Package}
        eyebrow="Política de riesgo"
        title="Las versiones de política se crean en el Motor"
        description="Esta pantalla ya no edita reglas. Aquí queda el camino a donde se hace ahora."
        actions={
          <Link href="/internal/risk-policy/current">
            <Button>Ver la política local vigente</Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-atlas-text">
            Por qué cambió
          </h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-atlas-text">
          <p>
            Escribir aquí una regla que aprueba o rechaza a una persona creaba
            una política que competía con la del Motor sin su gobierno: sin
            aprobación de un segundo par de ojos, sin segregación de funciones y
            sin auditoría encadenada. Con dos autores para la misma decisión,
            nadie podía decir después cuál se aplicó.
          </p>
          <p className="text-atlas-muted">
            El ruleset local no desaparece: es la degradación que evita bloquear
            altas cuando el Motor no responde, y se consulta en la política
            vigente. Lo que se retira es la autoría desde el portal.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {gobierno ? (
              <a
                href={gobierno}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-atlas-border px-3 py-1.5 text-sm text-atlas-text hover:bg-atlas-soft"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Gobierno de riesgo en el Motor
              </a>
            ) : null}
            {artefactos ? (
              <a
                href={artefactos}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-atlas-border px-3 py-1.5 text-sm text-atlas-text hover:bg-atlas-soft"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Artefactos y versiones
              </a>
            ) : null}
            {!gobierno && !artefactos ? (
              <p className="text-xs text-atlas-muted">
                Para enlazar al Motor hace falta configurar
                <span className="font-mono">
                  {" "}
                  NEXT_PUBLIC_DECISION_ENGINE_URL
                </span>
                .
              </p>
            ) : null}
          </div>
          <p className="text-xs text-atlas-muted">
            ¿Qué artefacto atiende cada tipo de decisión? Se elige en{" "}
            <Link
              href="/internal/settings/decision-artifacts"
              className="underline"
            >
              Ajustes · Artefactos de decisión
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}

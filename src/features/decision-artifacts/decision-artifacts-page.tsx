"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useAssignDecisionArtifact, useDecisionArtifacts } from "./hooks";
import type { BindingSource, DecisionType } from "./types";

/**
 * Qué política decide cada cosa.
 *
 * ## Por qué esta pantalla tenía que existir
 *
 * Qué artefacto del motor evalúa una identidad o un crédito eran VARIABLES DE ENTORNO
 * (`DECISION_ENGINE_IDENTITY_ARTIFACT`, `DECISION_ENGINE_CREDIT_ARTIFACT`), leídas del `.env` y del
 * `docker-compose.yml`. Tres consecuencias, y las tres se pagaron:
 *
 * 1. Cambiar la política que evalúa un crédito exigía editar un fichero y reiniciar un contenedor.
 *    Eso no es una decisión de infraestructura: la toma Riesgo, no quien tiene acceso al servidor.
 * 2. Nadie podía VER qué artefacto estaba decidiendo. Si Riesgo publicaba una versión nueva en el
 *    motor, el backend seguía llamando a lo que dijera su entorno y no había dónde comprobarlo.
 * 3. Se podía apuntar a un artefacto inexistente. El valor por defecto era `credit_underwriting`,
 *    que en el motor se llama `ATLAS_BNPL_UNDERWRITING`: cada solicitud de crédito daba 404 y caía
 *    en «el motor no está disponible» — un fallo mudo que dejaba el crédito esperando a una persona
 *    sin que nada dijera que el motor ni siquiera fue consultado.
 *
 * ## Por qué las opciones vienen del motor
 *
 * Porque es el único que sabe qué está publicado. De una lista no se puede elegir algo que no
 * existe, y ése era exactamente el fallo. Si el motor no contesta, la pantalla se abre igual para
 * enseñar lo vigente —pero no deja elegir a ciegas.
 */
const DECISION_LABEL: Record<DecisionType, { title: string; detail: string }> = {
  identity: {
    title: "Identidad",
    detail: "Qué política decide si la persona del carnet es quien dice ser.",
  },
  credit: {
    title: "Crédito",
    detail: "Qué política decide si se aprueba una solicitud y con qué límite.",
  },
  risk: {
    title: "Riesgo",
    detail: "Qué política evalúa el riesgo del cliente. Opcional: sin ella, no se consulta.",
  },
};

const SOURCE_LABEL: Record<BindingSource, { text: string; tone: "success" | "warning" | "muted" }> = {
  binding: { text: "Elegido aquí", tone: "success" },
  // Que venga del entorno no es un error, pero sí algo que conviene ver: significa que nadie lo ha
  // decidido desde el portal y que cambiarlo hoy exige un despliegue.
  environment: { text: "Desde el entorno", tone: "warning" },
  unset: { text: "Sin configurar", tone: "muted" },
};

export function DecisionArtifactsPage() {
  const artifacts = useDecisionArtifacts();
  const assign = useAssignDecisionArtifact();
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});

  const data = artifacts.data;
  const disponibles = data?.availableArtifacts ?? [];
  const motorSinResponder = !artifacts.isLoading && disponibles.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Motor de decisiones"
        description="Qué artefacto del motor decide cada cosa. Las opciones son las políticas que el motor tiene publicadas."
      />

      {artifacts.isLoading ? <LoadingSkeleton rows={3} /> : null}

      {artifacts.error ? (
        <ErrorState
          title="No pudimos leer la configuración"
          description="El servicio interno no respondió. Vuelve a intentarlo en unos segundos."
        />
      ) : null}

      {motorSinResponder ? (
        <Card>
          <CardContent>
            <p className="text-sm text-amber-700">
              El motor de decisiones no devolvió su catálogo de artefactos. Puedes ver la configuración vigente, pero no
              cambiarla hasta que responda: elegir un código a ciegas es justo lo que esta pantalla evita.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {data?.bindings.map((binding) => {
        const etiqueta = DECISION_LABEL[binding.decisionType];
        const origen = SOURCE_LABEL[binding.source];
        const elegido = seleccion[binding.decisionType] ?? binding.artifactCode ?? "";
        const cambiado = elegido !== "" && elegido !== binding.artifactCode;

        return (
          <Card key={binding.decisionType} testId={`binding-${binding.decisionType}`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-atlas-text">{etiqueta.title}</h3>
                  <p className="text-sm text-atlas-muted">{etiqueta.detail}</p>
                </div>
                <Badge tone={origen.tone}>{origen.text}</Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-72 flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-atlas-muted">Artefacto que decide</span>
                  <select
                    className="h-9 rounded-lg border border-atlas-border bg-white px-3 text-sm text-atlas-text"
                    value={elegido}
                    disabled={motorSinResponder}
                    onChange={(event) =>
                      setSeleccion((actual) => ({ ...actual, [binding.decisionType]: event.target.value }))
                    }
                  >
                    <option value="">Sin configurar</option>
                    {disponibles.map((artefacto) => (
                      <option key={artefacto.code} value={artefacto.code}>
                        {artefacto.code}
                        {artefacto.name ? ` — ${artefacto.name}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <Button
                  variant="primary"
                  disabled={!cambiado || assign.isPending}
                  isLoading={assign.isPending}
                  onClick={() =>
                    assign.mutate({
                      decisionType: binding.decisionType,
                      artifactCode: elegido,
                      notes: `Asignado desde el portal interno.`,
                    })
                  }
                >
                  Guardar
                </Button>
              </div>

              <p className="mt-3 text-xs text-atlas-muted">
                {binding.artifactCode
                  ? `Ahora mismo decide: ${binding.artifactCode}`
                  : "Ahora mismo no hay ningún artefacto asignado a esta decisión."}
              </p>
            </CardContent>
          </Card>
        );
      })}

      {assign.error ? (
        <ErrorState
          title="No se pudo guardar"
          description="El motor no publica ese artefacto. Elige uno de la lista y vuelve a intentarlo."
        />
      ) : null}
    </div>
  );
}

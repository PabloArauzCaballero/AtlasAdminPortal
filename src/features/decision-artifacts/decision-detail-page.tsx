"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useAssignDecisionArtifact, useDecisionArtifacts } from "./hooks";
import type { BindingSource, DecisionType } from "./types";

/**
 * Una decisión, explicada y configurable.
 *
 * Reúne en un sitio las cuatro preguntas que hasta ahora sólo se podían contestar leyendo el código:
 * qué decide, quién la llama, en qué punto del recorrido ocurre y qué política la resuelve. Las tres
 * primeras son hechos del sistema y se declaran junto al código que las ejecuta; la cuarta es una
 * decisión de negocio y se elige aquí.
 *
 * ## Por qué el endpoint y el flujo son enlaces
 *
 * Porque leer «POST /api/v1/customers/:customerId/credit-applications» y no poder ir a ver qué hace
 * deja la pregunta a medias. El endpoint enlaza a su documentación viva y el flujo a la vista de
 * ejecuciones del motor, que es donde se ve lo que esta política decidió de verdad.
 */
const SOURCE_LABEL: Record<BindingSource, { text: string; tone: "success" | "warning" | "muted" }> = {
  binding: { text: "Elegido aquí", tone: "success" },
  environment: { text: "Heredado del entorno", tone: "warning" },
  unset: { text: "Sin configurar", tone: "muted" },
};

/** Dónde vive la documentación viva de la API y el detalle de ejecuciones del motor. */
const API_DOCS = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") ?? "";
const ENGINE_URL = process.env.NEXT_PUBLIC_DECISION_ENGINE_URL ?? "http://localhost:5173";

export function DecisionDetailPage({ decisionType }: Readonly<{ decisionType: DecisionType }>) {
  const artifacts = useDecisionArtifacts();
  const assign = useAssignDecisionArtifact();
  const [artefacto, setArtefacto] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const binding = artifacts.data?.bindings.find((item) => item.decisionType === decisionType);
  const disponibles = artifacts.data?.availableArtifacts ?? [];
  const motorSinResponder = !artifacts.isLoading && disponibles.length === 0;

  if (artifacts.isLoading) return <LoadingSkeleton rows={6} />;
  if (!binding) {
    return (
      <ErrorState
        title="Esa decisión no existe"
        description="El catálogo no tiene ninguna decisión con ese identificador."
      />
    );
  }

  const elegido = artefacto ?? binding.artifactCode ?? "";
  const versionElegida = version ?? binding.pinnedVersion ?? "";
  const artefactoElegido = disponibles.find((item) => item.code === elegido);
  const cambiado =
    elegido !== "" && (elegido !== binding.artifactCode || versionElegida !== (binding.pinnedVersion ?? ""));
  const origen = SOURCE_LABEL[binding.source];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Motor de decisiones"
        title={binding.title ?? decisionType}
        description={binding.description ?? undefined}
        actions={
          <Link href="/internal/settings/decision-artifacts" className="text-sm text-atlas-accent hover:underline">
            ← Volver al catálogo
          </Link>
        }
      />

      {/*
        Negocio y sistemas, como en el resto del portal: la misma decision explicada para quien la
        aprueba y para quien la opera. El ejemplo es lo que convierte una definicion en algo que se
        puede discutir en un comite.
      */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-atlas-text">Explicación de negocio</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-atlas-text">{binding.business}</p>
            <p className="mt-3 border-l-2 border-atlas-accent/40 pl-3 text-sm italic leading-relaxed text-atlas-muted">
              <span className="font-semibold not-italic">Por ejemplo: </span>
              {binding.example}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-atlas-text">Explicación de sistemas</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-atlas-text">{binding.systems}</p>
          </CardContent>
        </Card>
      </div>

      <Card testId="decision-config">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-atlas-text">Qué política la resuelve</h3>
            <Badge tone={origen.tone}>{origen.text}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {motorSinResponder ? (
            <p className="mb-3 text-sm text-amber-700">
              El motor no devolvió su catálogo de artefactos. Puedes ver la configuración vigente, pero no cambiarla
              hasta que responda: elegir un código a ciegas es justo lo que esta pantalla evita.
            </p>
          ) : null}

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-64 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-atlas-muted">Artefacto que decide</span>
              <select
                className="h-9 rounded-lg border border-atlas-border bg-white px-3 text-sm text-atlas-text"
                value={elegido}
                disabled={motorSinResponder}
                onChange={(event) => setArtefacto(event.target.value)}
              >
                <option value="">Sin configurar</option>
                {disponibles.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code}
                    {item.name ? ` — ${item.name}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {/*
              Fijar la version es la otra mitad de la decision: sin fijarla, publicar una version
              nueva en el motor cambia lo que decide en produccion sin que nadie lo apruebe.
            */}
            <label className="flex w-56 flex-col gap-1">
              <span className="text-xs font-medium text-atlas-muted">Versión</span>
              <select
                className="h-9 rounded-lg border border-atlas-border bg-white px-3 text-sm text-atlas-text"
                value={versionElegida}
                disabled={motorSinResponder || !elegido}
                onChange={(event) => setVersion(event.target.value)}
              >
                <option value="">Seguir la vigente</option>
                {artefactoElegido?.latestVersion ? (
                  <option value={artefactoElegido.latestVersion}>
                    Fijar {artefactoElegido.latestVersion}
                    {artefactoElegido.status ? ` · ${artefactoElegido.status}` : ""}
                  </option>
                ) : null}
              </select>
            </label>

            <Button
              variant="primary"
              disabled={!cambiado || assign.isPending}
              isLoading={assign.isPending}
              onClick={() =>
                assign.mutate({
                  decisionType,
                  artifactCode: elegido,
                  pinnedVersion: versionElegida || null,
                  notes: "Asignado desde el portal interno.",
                })
              }
            >
              Guardar
            </Button>
          </div>

          <p className="mt-3 text-xs text-atlas-muted">
            {binding.artifactCode
              ? `Ahora mismo decide: ${binding.artifactCode}${
                  binding.pinnedVersion ? ` · versión fijada ${binding.pinnedVersion}` : " · versión vigente del despliegue"
                }`
              : "Ahora mismo no hay ningún artefacto asignado a esta decisión."}
          </p>

          {assign.isSuccess ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">Guardado. La decisión ya usa esta política.</p>
          ) : null}
          {assign.error ? (
            <p className="mt-2 text-xs font-medium text-red-700">
              El motor no publica ese artefacto. Elige uno de la lista y vuelve a intentarlo.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card testId="decision-endpoints">
          <CardHeader>
            <h3 className="text-sm font-semibold text-atlas-text">Endpoints que la llaman</h3>
            <p className="text-xs text-atlas-muted">Si cambias esta política, esto es lo que se ve afectado.</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(binding.consumerEndpoints ?? []).map((endpoint) => (
                <li key={`${endpoint.method}-${endpoint.path}`}>
                  <a
                    href={`${API_DOCS}/docs`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-atlas-accent hover:underline"
                  >
                    {endpoint.method} {endpoint.path}
                  </a>
                  <p className="mt-0.5 text-xs text-atlas-muted">{endpoint.purpose}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card testId="decision-workflow">
          <CardHeader>
            <h3 className="text-sm font-semibold text-atlas-text">Flujo de trabajo</h3>
            <p className="text-xs text-atlas-muted">{binding.workflowStage}</p>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {(binding.workflowSteps ?? []).map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-atlas-text">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-atlas-soft text-xs font-semibold text-atlas-muted">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <a
              href={`${ENGINE_URL}/executions`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-xs text-atlas-accent hover:underline"
            >
              Ver las ejecuciones de esta política en el motor →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

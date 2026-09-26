"use client";

import { FlaskConical, Gauge, KeyRound, Radar, Workflow } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { FeatureCard, Note, Section } from "./guide-primitives";
import { GuideScenarioMatrix } from "./guide-scenario-matrix";

export function Panorama() {
  return (
    <Section
      id="panorama"
      num="00"
      kicker="Panorama"
      title="Un laboratorio, tres formas de probar"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        El QA Lab vive en{" "}
        <code className="font-mono text-atlas-accent">/internal/qa/lab</code> y
        se organiza en dos pestañas. <strong>Prueba unitaria</strong> toma un
        endpoint del catálogo y ofrece dos tarjetas complementarias sobre él;{" "}
        <strong>Journey (encadenado)</strong> ejecuta una secuencia de endpoints
        simulando un flujo de negocio real.
      </p>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <FeatureCard
          icon={<FlaskConical className="h-5 w-5" />}
          title="Prueba funcional"
        >
          ¿El endpoint responde lo correcto? Un request, con payload y criterios
          de salida (status, JSON esperado, headers).
        </FeatureCard>
        <FeatureCard
          icon={<Gauge className="h-5 w-5" />}
          title="Prueba de stress"
          iconClass="bg-emerald-50 text-emerald-700"
        >
          ¿Aguanta carga? Ráfaga sintética con pacing por RPS, percentiles
          p50/p95/p99 y umbrales de aprobación.
        </FeatureCard>
        <FeatureCard
          icon={<Workflow className="h-5 w-5" />}
          title="Journey encadenado"
          iconClass="bg-amber-50 text-amber-700"
        >
          ¿Funciona el flujo completo? Varios endpoints en orden, pasando datos
          de una respuesta a la siguiente.
        </FeatureCard>
      </div>
      <Note tone="tip" tag="Modelo mental">
        <strong>Funcional</strong> = ¿está bien un ladrillo? ·{" "}
        <strong>Stress</strong> = ¿ese ladrillo aguanta peso? ·{" "}
        <strong>Journey</strong> = ¿la pared completa se sostiene? Empieza
        siempre por la funcional en <code>LOCAL</code> antes de subir la
        intensidad.
      </Note>
    </Section>
  );
}

export function Antes() {
  return (
    <Section
      id="antes"
      num="01"
      kicker="Antes de empezar"
      title="Target, permisos y el reflejo del dry-run"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        Tres decisiones preceden a cualquier ejecución:{" "}
        <strong>contra qué ambiente</strong> disparas,{" "}
        <strong>qué permiso</strong> tienes, y si estás en{" "}
        <strong>previsualización</strong> o vas en serio.
      </p>

      <div className="atlas-table-scroll rounded-xl border border-atlas-border">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-atlas-soft text-left font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-atlas-muted">
              <th className="px-4 py-2.5">Ambiente</th>
              <th className="px-4 py-2.5">Qué permite</th>
              <th className="px-4 py-2.5">Base URL</th>
            </tr>
          </thead>
          <tbody>
            <TargetRow
              badge={<Badge tone="success">LOCAL</Badge>}
              perm="Todo, incluida mutación real sin fricción extra."
              url="localhost:3005/api/v1"
            />
            <TargetRow
              badge={<Badge tone="info">STAGING</Badge>}
              perm={
                <>
                  Funcional y stress reales; mutación exige teclear{" "}
                  <code className="font-mono text-atlas-accent">EJECUTAR</code>.
                </>
              }
              url="NEXT_PUBLIC_STAGING_API_BASE_URL"
            />
            <TargetRow
              badge={<Badge tone="critical">PRODUCTION_READONLY</Badge>}
              perm={
                <>
                  Solo dry-run. Toda ejecución real y todo stress quedan{" "}
                  <strong>bloqueados</strong>.
                </>
              }
              url="NEXT_PUBLIC_PROD_READONLY_API_BASE_URL"
            />
          </tbody>
        </table>
      </div>
      <p className="text-sm text-atlas-muted">
        También puedes fijar un <strong>host manual</strong> (validado como{" "}
        <code className="font-mono">http(s)://…</code>) o elegir una ruta base
        distinta a la del ambiente.
      </p>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <FeatureCard
          icon={<Radar className="h-5 w-5" />}
          title="systems.endpoints.read"
        >
          Entrar al lab y ver el catálogo. Sin él, la página ni siquiera dispara
          consultas.
        </FeatureCard>
        <FeatureCard
          icon={<KeyRound className="h-5 w-5" />}
          title="systems.endpoints.execute"
        >
          Habilita el botón de la prueba funcional.
        </FeatureCard>
        <FeatureCard
          icon={<Gauge className="h-5 w-5" />}
          title="systems.stress.execute"
        >
          Habilita la tarjeta de stress.
        </FeatureCard>
      </div>

      <Note tone="warning" tag="Reflejo">
        El botón nace en <strong>dry-run</strong>. En previsualización el lab
        arma la petición exacta —URL, headers, payload— y te la muestra{" "}
        <strong>sin enviarla</strong>. Es tu red de seguridad: revisa el request
        antes de destildar &ldquo;Dry-run / modo seguro&rdquo;.
      </Note>
    </Section>
  );
}

function TargetRow({
  badge,
  perm,
  url,
}: Readonly<{ badge: React.ReactNode; perm: React.ReactNode; url: string }>) {
  return (
    <tr className="border-t border-atlas-border align-top">
      <td className="px-4 py-3">{badge}</td>
      <td className="px-4 py-3 text-atlas-text">{perm}</td>
      <td className="px-4 py-3 font-mono text-xs text-atlas-muted">{url}</td>
    </tr>
  );
}

export function Escenarios() {
  return (
    <Section
      id="escenarios"
      num="02"
      kicker="Escenarios y headers"
      title="Los headers los gestiona el lab por ti"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        No editas <code className="font-mono">Authorization</code> ni{" "}
        <code className="font-mono">x-tenant-id</code> a mano: eliges un{" "}
        <strong>escenario</strong> y el lab aplica el patch de headers correcto.
        Sirve para probar el camino feliz y, sobre todo, los caminos de rechazo.
        Haz clic en cada escenario para ver qué cambia.
      </p>
      <GuideScenarioMatrix />

      <h3 className="pt-2 text-base font-semibold text-atlas-text">
        El contrato de respuesta
      </h3>
      <p className="text-sm text-atlas-muted">
        Todo endpoint responde con una de estas dos formas, y el lab valida
        contra ella:
      </p>
      <pre className="atlas-scrollbar overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4">
        <code className="font-mono text-[0.75rem] leading-6 text-slate-100">{`{ requestId, data, timestamp }
{ requestId, error: { code, message }, timestamp }`}</code>
      </pre>
    </Section>
  );
}

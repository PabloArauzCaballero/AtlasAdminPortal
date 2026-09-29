"use client";

import { FlaskConical, Gauge, KeyRound, Radar, Workflow } from "lucide-react";
import { FeatureCard, Note, Section } from "./guide-primitives";
import { ScenarioTable, TargetsTable } from "./guide-tables";

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

      <TargetsTable />
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
        La tabla enseña, por escenario, qué cabecera se cambia y qué se espera.
      </p>
      <ScenarioTable />

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

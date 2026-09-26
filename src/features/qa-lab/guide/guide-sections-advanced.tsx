"use client";

import Link from "next/link";
import {
  Keyboard,
  Layers,
  Lock,
  ShieldCheck,
  Ticket,
  Workflow,
} from "lucide-react";
import { FeatureCard, Note, Section } from "./guide-primitives";
import { GuideJourneyDiagram } from "./guide-journey-diagram";

export function Journey() {
  return (
    <Section
      id="journey"
      num="05"
      kicker="Journey encadenado"
      title="Encadenar endpoints: la salida de uno alimenta al siguiente"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        Segunda pestaña del lab. Un journey es una{" "}
        <strong>lista ordenada de pasos</strong>; cada paso puede{" "}
        <strong>extraer</strong> un valor de su respuesta y los siguientes lo
        reinyectan con{" "}
        <code className="font-mono text-atlas-accent">{"{{variable}}"}</code>.
        Así validas un flujo de negocio entero, no un ladrillo suelto.
      </p>

      <h3 className="text-base font-semibold text-atlas-text">
        Cómo fluyen los datos
      </h3>
      <p className="text-sm text-atlas-muted">
        Este diagrama ilustra un onboarding de tres pasos. Fíjate cómo{" "}
        <code className="font-mono">customerId</code>, extraído en el paso 2,
        viaja al path del paso 3:
      </p>
      <GuideJourneyDiagram />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <FeatureCard
          icon={<Layers className="h-5 w-5" />}
          title="Campos por paso"
        >
          <code className="font-mono">key</code>,{" "}
          <code className="font-mono">endpointId</code>,{" "}
          <code className="font-mono">payload</code>,{" "}
          <code className="font-mono">pathParams</code>,{" "}
          <code className="font-mono">queryParams</code>,{" "}
          <code className="font-mono">headers</code>,{" "}
          <code className="font-mono">expectedStatusCodes</code>,{" "}
          <code className="font-mono">extract</code>,{" "}
          <code className="font-mono">authMode</code> y{" "}
          <code className="font-mono">allowMutations</code>. Cada paso puede
          tener su propio modo de auth.
        </FeatureCard>
        <FeatureCard
          icon={<Workflow className="h-5 w-5" />}
          title="Extraer y sustituir"
        >
          <code className="font-mono">extract</code> lee la respuesta por ruta
          con puntos (<code className="font-mono">data.customerId</code>).{" "}
          <code className="font-mono text-atlas-accent">
            {"{{customerId}}"}
          </code>{" "}
          se sustituye en cualquier string de payload, path, query o headers de
          los pasos siguientes.
        </FeatureCard>
      </div>

      <Note tone="critical" tag="Gotcha">
        En <strong>dry-run el journey no extrae valores</strong>: la
        previsualización no ejecuta de verdad, así que{" "}
        <code className="font-mono">{"{{customerId}}"}</code> se queda literal y
        el paso 3 fallará al resolver el path. Para ver el encadenamiento{" "}
        <strong>real</strong> hay que destildar dry-run (en <code>LOCAL</code>,
        o con doble confirmación fuera de él).
      </Note>
      <p className="text-sm text-atlas-muted">
        La &ldquo;lista de payloads encadenados&rdquo; es justamente ese array
        JSON: no se sube un archivo, se <strong>pega o edita</strong> en el
        editor del lab. El resultado trae{" "}
        <code className="font-mono">
          totalSteps / passedSteps / failedSteps
        </code>
        , el <code className="font-mono">context</code> acumulado de variables
        y, por paso, método, URL final, HTTP status, latencia y lo que extrajo.
      </p>

      <Note tone="tip" tag="Tercera pestaña">
        <strong>Árbol de decisión</strong> dibuja este mismo journey como una
        cadena de bifurcaciones: en cada paso, ¿responde lo esperado? Marca un
        fallo y verás pintado qué pasos se quedan sin su dato — sin tener que
        provocar el fallo de verdad.
      </Note>
    </Section>
  );
}

export function Seguridad() {
  return (
    <Section
      id="seguridad"
      num="06"
      kicker="Guardarraíles"
      title="Por qué es difícil hacerte daño con esto"
    >
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <FeatureCard
          icon={<Lock className="h-5 w-5" />}
          title="Tokens efímeros"
          iconClass="bg-red-50 text-red-700"
        >
          Nunca se persisten en el almacenamiento del navegador.{" "}
          <code className="font-mono">Authorization</code> y cookies van
          enmascarados en logs y resultados.
        </FeatureCard>
        <FeatureCard
          icon={<Keyboard className="h-5 w-5" />}
          title="Doble confirmación"
          iconClass="bg-red-50 text-red-700"
        >
          Mutación real fuera de <code>LOCAL</code> exige tildar el checkbox{" "}
          <strong>y</strong> teclear <code className="font-mono">EJECUTAR</code>
          . Sin eso, el diálogo no deja continuar.
        </FeatureCard>
        <FeatureCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Techo de carga"
          iconClass="bg-amber-50 text-amber-700"
        >
          Stress topado a <strong>10.000</strong> requests, con recorte
          automático y aviso si tu plan lo supera. Producción: stress totalmente
          bloqueado.
        </FeatureCard>
        <FeatureCard
          icon={<Ticket className="h-5 w-5" />}
          title="Ticket de aprobación"
          iconClass="bg-amber-50 text-amber-700"
        >
          Stress real fuera de <code>LOCAL</code> exige un ticket (p. ej.{" "}
          <code className="font-mono">CHG-123</code>); sin él la corrida se
          bloquea por seguridad.
        </FeatureCard>
      </div>
    </Section>
  );
}

export function Historial() {
  return (
    <Section
      id="historial"
      num="07"
      kicker="Historial"
      title="Dónde quedan las corridas"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        Desde la cabecera del lab, dos accesos guardan lo que ejecutas para
        auditoría y comparación manual:
      </p>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Link
          href="/internal/qa/runs"
          className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-card-hover"
        >
          <p className="font-mono text-sm text-atlas-accent">
            /internal/qa/runs
          </p>
          <p className="mt-1 text-sm text-atlas-muted">
            <strong className="text-atlas-text">Ejecuciones QA</strong> —
            corridas funcionales y de journey ejecutadas desde el lab.
          </p>
        </Link>
        <Link
          href="/internal/qa/stress"
          className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-card-hover"
        >
          <p className="font-mono text-sm text-atlas-accent">
            /internal/qa/stress
          </p>
          <p className="mt-1 text-sm text-atlas-muted">
            <strong className="text-atlas-text">Carga QA</strong> — el registro
            de pruebas de carga, perfil por perfil.
          </p>
        </Link>
      </div>
      <Note tone="tip" tag="Ruta sugerida">
        Selecciona el endpoint → <strong>funcional en dry-run</strong> para ver
        el request → funcional real en <code>LOCAL</code> →{" "}
        <strong>stress</strong> suave (5 RPS / 30 s) leyendo el gráfico → arma
        el <strong>journey</strong> del flujo y ejecútalo real en{" "}
        <code>LOCAL</code>. Solo entonces sube a <code>STAGING</code>.
      </Note>
    </Section>
  );
}

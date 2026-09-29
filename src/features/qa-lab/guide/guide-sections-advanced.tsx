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
        Segunda pestaña del lab. Un recorrido es una{" "}
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
        Este diagrama ilustra un alta de cliente de tres pasos. Fíjate cómo el
        número de cliente, extraído en el paso 2, viaja a la ruta del paso 3:
      </p>
      <GuideJourneyDiagram />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <FeatureCard
          icon={<Layers className="h-5 w-5" />}
          title="Campos por paso (en el JSON)"
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
          tener su propio modo de identificación.
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
          se sustituye en cualquier texto del cuerpo, la ruta, la consulta o las
          cabeceras de los pasos siguientes.
        </FeatureCard>
      </div>

      <Note tone="critical" tag="Atención">
        En <strong>dry-run (simulación) el recorrido no extrae valores</strong>:
        la previsualización no ejecuta de verdad, así que{" "}
        <code className="font-mono">{"{{customerId}}"}</code> se queda literal y
        el paso 3 fallará al resolver la ruta. Para ver el encadenamiento{" "}
        <strong>real</strong> hay que destildar dry-run (en <code>LOCAL</code>,
        o con doble confirmación fuera de él).
      </Note>
      <p className="text-sm text-atlas-muted">
        La &ldquo;lista de pasos encadenados&rdquo; es justamente esa lista en
        JSON: no se sube un archivo, se <strong>pega o edita</strong> en el
        editor del lab. El resultado trae los pasos totales, aprobados y
        fallidos, las variables acumuladas y, por paso, método, dirección final,
        código HTTP, latencia y lo que extrajo.
      </p>

      <Note tone="tip" tag="Tercera pestaña">
        <strong>Árbol de decisión</strong> dibuja este mismo recorrido como una
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
          title="Credenciales que no se guardan"
          iconClass="bg-red-50 text-red-700"
        >
          Nunca se persisten en el almacenamiento del navegador. La cabecera de
          autorización y las cookies van enmascaradas en registros y resultados.
        </FeatureCard>
        <FeatureCard
          icon={<Keyboard className="h-5 w-5" />}
          title="Doble confirmación"
          iconClass="bg-red-50 text-red-700"
        >
          Un cambio real fuera de <code>LOCAL</code> exige marcar la casilla{" "}
          <strong>y</strong> teclear <code className="font-mono">EJECUTAR</code>
          . Sin eso, el diálogo no deja continuar.
        </FeatureCard>
        <FeatureCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Techo de carga"
          iconClass="bg-amber-50 text-amber-700"
        >
          La carga tiene un tope de <strong>10.000</strong> peticiones, con
          recorte automático y aviso si tu plan lo supera. En producción la
          prueba de carga está bloqueada.
        </FeatureCard>
        <FeatureCard
          icon={<Ticket className="h-5 w-5" />}
          title="Ticket de aprobación"
          iconClass="bg-amber-50 text-amber-700"
        >
          Una carga real fuera de <code>LOCAL</code> exige un ticket (p. ej.{" "}
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
        Las pruebas sueltas del lab (funcional y carga) y el editor de pasos del
        recorrido corren en tu navegador y{" "}
        <strong>no se guardan en ningún historial</strong>: si necesitas
        conservar una, descarga su registro. Lo que sí queda guardado vive en
        otras pantallas:
      </p>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Link
          href="/internal/qa/runs"
          className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-card-hover"
        >
          <p className="text-sm font-semibold text-atlas-accent">
            Ver ejecuciones QA
          </p>
          <p className="mt-1 text-sm text-atlas-muted">
            <strong className="text-atlas-text">Ejecuciones QA</strong> — las
            corridas de suites y los recorridos que se lanzan en el servidor.
          </p>
        </Link>
        <Link
          href="/internal/qa/stress"
          className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-card-hover"
        >
          <p className="text-sm font-semibold text-atlas-accent">
            Ver carga QA
          </p>
          <p className="mt-1 text-sm text-atlas-muted">
            <strong className="text-atlas-text">Carga QA</strong> — perfiles de
            carga guardados. Encolar deja la corrida en cola; sólo se ejecuta si
            el servicio de carga está encendido en ese entorno.
          </p>
        </Link>
      </div>
      <Note tone="tip" tag="Ruta sugerida">
        Selecciona la ruta → <strong>funcional en dry-run</strong> para ver la
        petición → funcional real en <code>LOCAL</code> → <strong>carga</strong>{" "}
        suave (5 peticiones/s durante 30 s) leyendo el gráfico → arma el{" "}
        <strong>recorrido</strong> del flujo y ejecútalo real en{" "}
        <code>LOCAL</code>. Solo entonces sube a <code>STAGING</code>.
      </Note>
    </Section>
  );
}

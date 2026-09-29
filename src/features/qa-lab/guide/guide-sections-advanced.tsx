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
      kicker="Recorrido encadenado"
      title="Encadenar operaciones: la salida de una alimenta a la siguiente"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        Segunda pestaña del laboratorio. Un recorrido es una{" "}
        <strong>lista ordenada de pasos</strong>; cada paso puede{" "}
        <strong>extraer</strong> un valor de su respuesta y los siguientes lo
        reutilizan escribiendo su nombre entre dobles llaves. Así validas un
        flujo de negocio entero, no un ladrillo suelto.
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
          title="Qué lleva cada paso"
        >
          Un nombre, la operación que llama, los datos que envía, los parámetros
          de la ruta y de la búsqueda, las cabeceras, los códigos de respuesta
          que se aceptan, qué valores extrae, cómo se identifica y si puede
          cambiar datos. Cada paso puede tener su propio modo de identificación.
        </FeatureCard>
        <FeatureCard
          icon={<Workflow className="h-5 w-5" />}
          title="Extraer y sustituir"
        >
          Cada paso puede guardar un valor de su respuesta, por ejemplo el
          número de cliente, con un nombre. Ese nombre se sustituye por el valor
          en los datos, la ruta, la búsqueda o las cabeceras de los pasos
          siguientes.
        </FeatureCard>
      </div>

      <Note tone="critical" tag="Atención">
        En <strong>simulación el recorrido no extrae valores</strong>: la
        previsualización no ejecuta de verdad, así que el número de cliente no
        llega al paso 3 y ese paso fallará al armar la ruta. Para ver el
        encadenamiento <strong>real</strong> hay que desmarcar la simulación (en
        el ambiente local, o con doble confirmación fuera de él).
      </Note>
      <p className="text-sm text-atlas-muted">
        La &ldquo;lista de pasos encadenados&rdquo; es justamente esa lista: no
        se sube un archivo, se <strong>pega o edita</strong> en el editor del
        laboratorio. El resultado trae los pasos totales, aprobados y fallidos,
        los valores guardados y, por paso, método, dirección final, código de
        respuesta, tiempo y lo que extrajo.
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
          Un cambio real fuera del ambiente local exige marcar la casilla{" "}
          <strong>y</strong> teclear la palabra EJECUTAR. Sin eso, el diálogo no
          deja continuar.
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
          Una carga real fuera del ambiente local exige un número de ticket de
          cambio aprobado; sin él la corrida se bloquea por seguridad.
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
        Las pruebas sueltas del laboratorio (funcional y carga) y el editor de
        pasos del recorrido corren en tu navegador y{" "}
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
            corridas de baterías de prueba y los recorridos que se lanzan en el
            servidor.
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
        Elige la operación → <strong>funcional en simulación</strong> para ver
        la petición → funcional real en el ambiente local →{" "}
        <strong>carga</strong> suave (5 peticiones por segundo durante 30
        segundos) leyendo el gráfico → arma el <strong>recorrido</strong> del
        flujo y ejecútalo real en local. Sólo entonces pasa al ambiente de
        preproducción.
      </Note>
    </Section>
  );
}

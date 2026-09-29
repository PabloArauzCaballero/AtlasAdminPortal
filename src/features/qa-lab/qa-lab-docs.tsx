"use client";

import { useState } from "react";
import {
  ChevronDown,
  FlaskConical,
  KeySquare,
  Layers,
  Lock,
  Radar,
  Workflow,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ScenarioTable } from "./guide/guide-tables";

export function QaLabDocsPanel() {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-2 text-white">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-atlas-text">
              Cómo funciona la prueba unitaria
            </p>
            <p className="text-xs text-atlas-muted">
              desde tu navegador · datos generados · escenarios · qué se
              comprueba
            </p>
          </div>
        </div>
        {/*
          Antes el estado se decía con una insignia («Ver guía» / «Ocultar»),
          que se lee como etiqueta y no como control. El chevron dice lo mismo
          con la dirección y es el mismo gesto que el resto de desplegables.
        */}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-atlas-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {expanded ? (
        <CardContent className="grid gap-4 border-t border-atlas-border pt-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <DocCard
            icon={<Radar className="h-4 w-4" />}
            title="Contra qué API"
            points={[
              "«Este mismo portal» usa la API del propio portal; es lo correcto en un portal desplegado.",
              "«Tu máquina» sólo sirve si abriste el portal en tu ordenador.",
              "En producción sólo se puede previsualizar la petición, nunca enviarla.",
            ]}
          />
          <DocCard
            icon={<FlaskConical className="h-4 w-4" />}
            title="Datos generados"
            points={[
              "Los datos de persona salen del generador del simulador de proveedores, con la semilla elegida.",
              "Una semilla con nombre repite las mismas personas; «Personas nuevas» crea un lote nuevo.",
              "Si el generador no responde, se dice y no se inventa nada.",
            ]}
          />
          <DocCard
            icon={<KeySquare className="h-4 w-4" />}
            title="Credencial y cabeceras"
            points={[
              "Tu sesión, ninguna, una credencial falsa o el token de otro actor; en las tres últimas tu cookie no viaja.",
              "Empresa (sale de tu sesión) salvo que el escenario la quite.",
              "Una protección contra duplicados nueva en cada petición que cambia datos.",
            ]}
          />
          <DocCard
            icon={<Layers className="h-4 w-4" />}
            title="Forma de la respuesta"
            points={[
              "O trae los datos pedidos, o trae un error con su código y su mensaje.",
              "Las dos formas llevan el código de la petición y la hora.",
            ]}
          />
          <DocCard
            icon={<Lock className="h-4 w-4" />}
            title="Seguridad"
            points={[
              "En el resultado y en el registro descargable, token y cookies se muestran recortados.",
              'Un cambio real fuera de tu máquina exige marcar «Permitir cambios reales» y escribir "EJECUTAR", también en la carga.',
              "La carga tiene un tope firme de 10.000 peticiones y está bloqueada en producción.",
              "Nada de esto se guarda: la prueba corre en tu navegador.",
            ]}
          />
          <div className="rounded-xl border border-atlas-border bg-atlas-soft p-4 md:col-span-2 xl:col-span-3">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-atlas-text">
              <Workflow className="h-3.5 w-3.5" /> Escenarios de prueba
            </p>
            <ScenarioTable />
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function DocCard({
  icon,
  title,
  points,
  children,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  points: string[];
  children?: React.ReactNode;
}>) {
  return (
    <div className="rounded-xl border border-atlas-border bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-lg bg-atlas-soft p-1.5 text-atlas-text">
          {icon}
        </div>
        <p className="text-sm font-semibold text-atlas-text">{title}</p>
      </div>
      {points.length ? (
        <ul className="space-y-1.5 text-xs leading-5 text-atlas-muted">
          {points.map((point) => (
            <li key={point} className="flex gap-1.5">
              <span className="text-atlas-text">·</span>
              {point}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  );
}

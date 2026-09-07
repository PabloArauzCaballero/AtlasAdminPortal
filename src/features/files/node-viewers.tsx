"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useVisibilidad } from "./hooks";
import { alcanza, type Espectador, type Nodo } from "./types";

/**
 * Quién ve este archivo.
 *
 * ## Por qué no se listan las concesiones
 *
 * Es lo que hacía antes y por eso la pestaña parecía rota: las concesiones son las ampliaciones
 * manuales del acceso, casi siempre ninguna, así que un archivo que ve todo el equipo de riesgo
 * salía como «nadie tiene acceso concedido aquí». Sobre la cara y el carnet de una persona, esa
 * frase no es un matiz: es la conclusión contraria a la verdadera.
 *
 * Ahora el backend resuelve el nivel efectivo de cada persona interna —el suelo de su rol más lo
 * que se le haya concedido— y esta pestaña enseña el resultado. Arriba, quienes entran por el
 * Motor de Decisión: son quienes ya ven esta misma evidencia al resolver el caso, y son la
 * respuesta por defecto a la pregunta.
 */
export function QuienLoVe({
  expedienteId,
  nodo,
  onCompartir,
}: Readonly<{
  expedienteId: string;
  nodo: Nodo;
  onCompartir: (nodo: Nodo) => void;
}>) {
  const visibilidad = useVisibilidad(expedienteId, nodo.nodoId);
  const puedeCompartir = alcanza(nodo.nivelEfectivo, "compartir");

  if (visibilidad.isLoading) return <LoadingSkeleton rows={4} />;
  if (visibilidad.error) {
    return (
      <ErrorState
        title="No se pudo resolver quién lo ve."
        description="Sin esta lista no se puede afirmar que el archivo esté restringido. Vuelve a intentarlo."
        onRetry={() => void visibilidad.refetch()}
      />
    );
  }

  const espectadores = visibilidad.data ?? [];
  const delMotor = espectadores.filter((quien) => quien.accedeAlMotor);
  const resto = espectadores.filter((quien) => !quien.accedeAlMotor);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        {espectadores.length === 0
          ? "Nadie más que tú alcanza este archivo."
          : `${String(espectadores.length)} personas pueden abrir este archivo. El acceso se hereda hacia lo que hay dentro.`}
      </p>

      <Grupo
        titulo="Riesgo · entran por el Motor de Decisión"
        descripcion="Ven esta evidencia al resolver el caso. Es el acceso por defecto, no una excepción."
        espectadores={delMotor}
        vacio="Nadie de riesgo alcanza este archivo."
      />
      <Grupo
        titulo="Resto del personal interno"
        descripcion="Acceso por su rol o por una concesión sobre esta carpeta."
        espectadores={resto}
        vacio="Nadie fuera de riesgo lo ve."
      />

      {puedeCompartir ? (
        <Button variant="secondary" onClick={() => onCompartir(nodo)}>
          Gestionar el acceso
        </Button>
      ) : (
        <p className="text-xs text-slate-500">
          Tu nivel aquí no alcanza para cambiar quién lo ve.
        </p>
      )}
    </div>
  );
}

function Grupo({
  titulo,
  descripcion,
  espectadores,
  vacio,
}: Readonly<{
  titulo: string;
  descripcion: string;
  espectadores: Espectador[];
  vacio: string;
}>) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {titulo}
        </h3>
        <p className="text-xs text-slate-400">{descripcion}</p>
      </div>
      {espectadores.length === 0 ? (
        <p className="text-sm text-slate-500">{vacio}</p>
      ) : (
        <ul className="space-y-1">
          {espectadores.map((quien) => (
            <FilaDeEspectador key={quien.internalUserId} espectador={quien} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilaDeEspectador({
  espectador,
}: Readonly<{ espectador: Espectador }>) {
  return (
    <li className="rounded border border-slate-200 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {espectador.accedeAlMotor ? (
          <ShieldCheck
            className="h-3.5 w-3.5 text-atlas-info"
            aria-label="Accede al Motor de Decisión"
          />
        ) : null}
        <span className="select-text font-medium text-atlas-text">
          {espectador.nombre}
        </span>
        <Badge tone="info">{espectador.nivel}</Badge>
        {espectador.estado && espectador.estado !== "active" ? (
          <Badge tone="warning">{espectador.estado}</Badge>
        ) : null}
      </div>
      {espectador.email ? (
        <p className="select-text text-xs text-slate-500">{espectador.email}</p>
      ) : null}
      <p className="mt-0.5 text-xs text-slate-500">
        {espectador.roles.length > 0
          ? espectador.roles.join(", ")
          : "Sin rol con permiso de expedientes"}
        {" · "}
        {motivoDelAcceso(espectador)}
      </p>
    </li>
  );
}

/**
 * De dónde le viene el acceso, en una frase.
 *
 * Importa porque decide dónde se quita: lo que llega por el rol se quita en el catálogo de
 * permisos, lo heredado se quita en la carpeta de arriba y sólo lo directo se quita aquí. Sin
 * decirlo, el botón de gestionar el acceso parece roto para dos de los tres casos.
 */
function motivoDelAcceso(espectador: Espectador): string {
  if (espectador.porConcesionDirecta) {
    return espectador.heredadaDe
      ? `compartido con esta persona en ${espectador.heredadaDe}`
      : "compartido con esta persona aquí";
  }
  if (espectador.porConcesionDeRol) {
    return espectador.heredadaDe
      ? `compartido con su rol en ${espectador.heredadaDe}`
      : "compartido con su rol aquí";
  }
  return "por su rol, sin que nadie lo comparta";
}

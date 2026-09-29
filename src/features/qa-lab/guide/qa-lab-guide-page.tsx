"use client";

import { GuideNav } from "./guide-primitives";
import { Antes, Escenarios, Panorama } from "./guide-sections-intro";
import { Funcional, Stress } from "./guide-sections-testing";
import { Historial, Journey, Seguridad } from "./guide-sections-advanced";

/**
 * Pestaña «Guía de referencia» de Aprender QA Lab: cómo probar la API como si
 * fueras el negocio —funcional, carga y journeys— con las barreras que impiden
 * romper producción. El permiso lo pone la página contenedora.
 */
export function QaLabGuide() {
  return (
    <div className="grid gap-8 grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)]">
      <GuideNav />
      <div className="min-w-0 space-y-12">
        <Panorama />
        <Antes />
        <Escenarios />
        <Funcional />
        <Stress />
        <Journey />
        <Seguridad />
        <Historial />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/page-header";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { GuideNav } from "./guide-primitives";
import { Antes, Escenarios, Panorama } from "./guide-sections-intro";
import { Funcional, Stress } from "./guide-sections-testing";
import { Historial, Journey, Seguridad } from "./guide-sections-advanced";

export function QaLabGuidePage() {
  return (
    <PermissionGate permissions={["systems.endpoints.read"]}>
      <PageHeader
        eyebrow="QA Console"
        title="Guía del Laboratorio de testing"
        description="Cómo probar la API como si fueras el negocio: una prueba funcional, una de carga y journeys que encadenan varios endpoints — con las barreras de seguridad que impiden romper producción."
        actions={
          <Link href="/internal/qa/lab">
            <Button variant="primary">Abrir el lab</Button>
          </Link>
        }
      />
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
    </PermissionGate>
  );
}

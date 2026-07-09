"use client";

import type { EndpointItem } from "@/features/systems/types";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { formatBoolean } from "@/shared/lib/format";

export function EndpointSummary({
  endpoint,
}: Readonly<{ endpoint: EndpointItem }>) {
  return (
    <div className="space-y-4">
      <KeyValueSection
        title="Identificación técnica"
        description="Ubicación real del contrato expuesto por el servicio."
        items={[
          { label: "Ruta completa", value: endpoint.fullPath, mono: true },
          { label: "Módulo", value: endpoint.module },
          { label: "Controlador", value: endpoint.controllerName, mono: true },
          { label: "Handler", value: endpoint.handlerName, mono: true },
        ]}
      />
      <KeyValueSection
        title="Propósito y responsabilidad"
        description="Contexto de negocio usado para QA, gobierno y reportería."
        items={[
          { label: "Acción de negocio", value: endpoint.businessAction },
          { label: "Propósito", value: endpoint.businessPurpose },
          { label: "Equipo dueño", value: endpoint.ownerTeam },
          { label: "Fuente", value: endpoint.sourceFile, mono: true },
        ]}
      />
      <KeyValueSection
        title="Controles operativos"
        description="Reglas que definen cómo se puede ejecutar y probar."
        items={[
          {
            label: "Requiere auth",
            value: formatBoolean(endpoint.requiresAuth),
          },
          { label: "Solo lectura", value: formatBoolean(endpoint.isReadonly) },
          {
            label: "Destructivo",
            value: formatBoolean(endpoint.isDestructive),
          },
          {
            label: "Testable desde portal",
            value: formatBoolean(endpoint.isTestableFromPortal),
          },
          { label: "Estado", value: endpoint.status },
          { label: "Nivel de confianza", value: endpoint.confidenceLevel },
        ]}
      />
    </div>
  );
}

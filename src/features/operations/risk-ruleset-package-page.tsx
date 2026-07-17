"use client";

import Link from "next/link";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { useCreateRiskRulesetVersionMutation } from "./hooks";
import { PackageEditor } from "./package-editor";
import {
  createRiskRulesetVersionSchema,
  riskRulesetPackageTemplate,
  type CreateRiskRulesetVersionInput,
} from "./risk-ruleset-schema";

/**
 * Alta de una versión de ruleset de riesgo (modelo + ruleset + reglas + señales).
 *
 * La versión nace en `draft`/`inactive`: crear el paquete NO cambia la política
 * vigente. Activarla es un paso aparte, restringido a admin/platform_admin, que
 * se hace desde la política de riesgo actual.
 *
 * Gate con `operations.riskPolicy.read`, la clave real del módulo. No existe
 * clave de escritura: el backend limita por rol y devuelve 403 a quien no
 * corresponde.
 */
export function RiskRulesetPackagePage() {
  const create = useCreateRiskRulesetVersionMutation();

  return (
    <PermissionGate permissions={["operations.riskPolicy.read"]}>
      <PageHeader
        eyebrow="Política de riesgo"
        title="Nueva versión de ruleset"
        description="Conectado a `/operations/risk-policy/ruleset-versions`. Crea el modelo, el ruleset y sus reglas en borrador — no activa nada."
        actions={
          <Link href="/internal/risk-policy/current">
            <Button>Ver política actual</Button>
          </Link>
        }
      />

      <BusinessContextNote>
        Un ruleset es el conjunto de reglas que decide aprobar, revisar o
        rechazar. Esta pantalla solo lo <strong>crea en borrador</strong>: la
        política que corre en producción no cambia hasta que un administrador
        active la versión desde la política de riesgo actual. Cada regla lleva
        una expresión JSON propia (
        <span className="font-mono">expressionJson</span>
        ), que es la condición que se evalúa en vivo.
      </BusinessContextNote>

      <PackageEditor<CreateRiskRulesetVersionInput>
        schema={createRiskRulesetVersionSchema}
        template={riskRulesetPackageTemplate}
        summarize={(value) => [
          { label: "modelo", count: 1 },
          { label: "ruleset", count: 1 },
          { label: "reglas", count: value.rules.length },
          { label: "señales de riesgo", count: value.riskSignalSeeds.length },
        ]}
        confirmPhrase="crear ruleset"
        confirmDescription="Se crea la versión de modelo y ruleset en borrador con sus reglas. No se activa: la política de riesgo vigente no cambia hasta que un administrador active esta versión."
        submitLabel="Crear versión de ruleset"
        onSubmit={(value) => create.mutate(value)}
        isPending={create.isPending}
        error={create.error}
        successNode={
          create.isSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Versión de ruleset creada en borrador. Para ponerla en vigencia,
              actívala desde la política de riesgo actual.
            </div>
          ) : null
        }
      />
    </PermissionGate>
  );
}

"use client";

import Link from "next/link";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import {
  dataGovernancePolicyPackageSchema,
  governancePackageTemplate,
  type DataGovernancePolicyPackageInput,
} from "./governance-package-schema";
import { useUpsertGovernancePackageMutation } from "./hooks";
import { PackageEditor } from "./package-editor";

/**
 * Publicación del paquete de políticas de gobernanza de datos.
 *
 * Gate con `governance.policies.read`, la clave real de la sección. No existe
 * clave de escritura: el backend limita el endpoint por rol y devuelve 403 a
 * quien no corresponde.
 */
export function GovernancePackagePage() {
  const upsert = useUpsertGovernancePackageMutation();

  return (
    <PermissionGate permissions={["governance.policies.read"]}>
      <PageHeader
        eyebrow="Gobierno de datos"
        title="Publicar paquete de gobernanza"
        description="Conectado a `/operations/data-governance/policy-package`. Crea o actualiza en lote propósitos, retenciones, proveedores, clasificaciones, campos sensibles y reglas de calidad."
        actions={
          <Link href="/internal/governance/policies">
            <Button>Ver políticas</Button>
          </Link>
        }
      />

      <BusinessContextNote>
        Este paquete define qué se puede guardar, por cuánto tiempo, quién lo ve
        y qué dato es sensible. Es la base del cumplimiento: una retención mal
        cargada puede hacer que se borren datos que había que conservar, o que
        se conserven datos que había que borrar. Se aplica en lote, así que el
        paquete se valida completo y se muestra el resumen antes de enviarlo.
      </BusinessContextNote>

      <PackageEditor<DataGovernancePolicyPackageInput>
        schema={dataGovernancePolicyPackageSchema}
        template={governancePackageTemplate}
        summarize={(value) => [
          { label: "propósitos", count: value.privacyPurposes.length },
          { label: "retenciones", count: value.retentionPolicies.length },
          { label: "proveedores", count: value.dataProviders.length },
          {
            label: "clasificaciones",
            count: value.classificationPolicies.length,
          },
          {
            label: "campos sensibles",
            count: value.sensitiveFieldRules.length,
          },
          { label: "reglas de calidad", count: value.dataQualityRules.length },
        ]}
        confirmPhrase="publicar gobernanza"
        confirmDescription="Se crean o actualizan en lote las políticas de gobernanza de datos. Afecta retención, clasificación y tratamiento de datos personales en toda la plataforma."
        submitLabel="Publicar paquete"
        onSubmit={(value) => upsert.mutate(value)}
        isPending={upsert.isPending}
        error={upsert.error}
        successNode={
          upsert.isSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Paquete de gobernanza aplicado.
            </div>
          ) : null
        }
      />
    </PermissionGate>
  );
}

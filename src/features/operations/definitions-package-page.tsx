"use client";

import Link from "next/link";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import {
  definitionsPackageSchema,
  definitionsPackageTemplate,
  type DefinitionsPackageInput,
} from "./definitions-package-schema";
import { useUpsertDefinitionsPackageMutation } from "./hooks";
import { PackageEditor } from "./package-editor";

/**
 * Publicación del paquete de definiciones semánticas.
 *
 * Gate con `businessMetadata.read`, la clave real de la sección donde viven las
 * definiciones. No existe una clave de escritura para este módulo: el backend
 * limita el endpoint por rol (operador interno para arriba) y devuelve 403 a
 * quien no corresponde. El permiso de lectura solo controla ver la pantalla.
 */
export function DefinitionsPackagePage() {
  const upsert = useUpsertDefinitionsPackageMutation();

  return (
    <PermissionGate permissions={["businessMetadata.read"]}>
      <PageHeader
        eyebrow="Definiciones"
        title="Publicar paquete de definiciones"
        description="Conectado a `/operations/definitions/package`. Crea o actualiza en lote eventos, observaciones, atributos y features de un dominio."
        actions={
          <Link href="/internal/business-metadata/definitions">
            <Button>Ver definiciones</Button>
          </Link>
        }
      />

      <BusinessContextNote>
        Las definiciones son el vocabulario con el que se escriben las reglas de
        riesgo y los modelos: qué es un &quot;evento de login&quot;, qué feature
        alimenta un score. Publicar un paquete reescribe ese vocabulario para
        todo un dominio de una sola vez, así que un código mal escrito acá deja
        reglas apuntando a una señal que no existe. Por eso el paquete se valida
        completo antes de enviarse y nunca se aplica a medias.
      </BusinessContextNote>

      <PackageEditor<DefinitionsPackageInput>
        schema={definitionsPackageSchema}
        template={definitionsPackageTemplate}
        summarize={(value) => [
          { label: "eventos", count: value.definitions.events.length },
          {
            label: "observaciones",
            count: value.definitions.observations.length,
          },
          { label: "atributos", count: value.definitions.attributes.length },
          { label: "features", count: value.definitions.features.length },
        ]}
        confirmPhrase="publicar definiciones"
        confirmDescription="Se crean o actualizan en lote las definiciones del dominio indicado. Las reglas y modelos que ya referencian estos códigos pasarán a leer la nueva versión."
        submitLabel="Publicar paquete"
        onSubmit={(value) => upsert.mutate(value)}
        isPending={upsert.isPending}
        error={upsert.error}
        successNode={
          upsert.isSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Paquete de definiciones aplicado.
            </div>
          ) : null
        }
      />
    </PermissionGate>
  );
}

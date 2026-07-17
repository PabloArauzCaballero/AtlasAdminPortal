"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDataEntity,
  useUpdateDataEntityMetadataMutation,
} from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { EntityMetadataForm } from "./forms/entity-metadata-form";

export function DataEntityMetadataPage(props: Readonly<{ entityId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate
      permissions={[
        "catalog.data.manage",
        "systems.dataEntities.updateMetadata",
      ]}
    >
      <AuthorizedDataEntityMetadataPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedDataEntityMetadataPage({
  entityId,
}: Readonly<{ entityId: string }>) {
  const router = useRouter();
  const entity = useDataEntity(entityId);
  const mutation = useUpdateDataEntityMetadataMutation(entityId);

  return (
    <>
      <PageHeader
        eyebrow="Formulario de catálogo"
        title="Configurar tabla"
        description="Define metadata de negocio y reglas operativas para que el servicio interno las aplique desde backend."
        actions={
          <Link href={`/internal/data-catalog/tables/${entityId}`}>
            <Button>Volver al detalle</Button>
          </Link>
        }
      />
      {entity.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {entity.error ? (
        <ErrorState
          description={
            isAtlasApiError(entity.error)
              ? entity.error.message
              : "No se pudo cargar la tabla."
          }
          requestId={
            isAtlasApiError(entity.error) ? entity.error.requestId : undefined
          }
          onRetry={() => void entity.refetch()}
        />
      ) : null}
      {mutation.error ? (
        <ErrorState
          description={
            isAtlasApiError(mutation.error)
              ? mutation.error.message
              : "No se pudo guardar la configuración."
          }
          requestId={
            isAtlasApiError(mutation.error)
              ? mutation.error.requestId
              : undefined
          }
        />
      ) : null}
      {entity.data ? (
        <EntityMetadataForm
          entity={entity.data}
          isSaving={mutation.isPending}
          onSubmit={(values) =>
            mutation.mutate(values, {
              onSuccess: () =>
                router.push(`/internal/data-catalog/tables/${entityId}`),
            })
          }
        />
      ) : null}
    </>
  );
}

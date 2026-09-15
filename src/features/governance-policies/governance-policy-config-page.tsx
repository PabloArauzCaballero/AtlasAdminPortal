"use client";

import Link from "next/link";
import { useGovernancePolicy } from "./hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { PolicyConfigSummary } from "./policy-config-summary";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";

/**
 * La configuración de una política, de sólo lectura.
 *
 * Aquí había un formulario que «guardaba» con `PATCH /internal/governance/policies/:id` y
 * redirigía al detalle como si hubiera persistido. AtlasBackend retiró esa ruta porque devolvía
 * 200 sin escribir nada; el formulario sobrevivió y pasó a fallar con 404 después de rellenarlo
 * entero. Lo honesto es enseñar lo que rige y decir dónde se cambia.
 */
export function GovernancePolicyConfigPage(
  props: Readonly<{ policyId: string }>,
) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["governance.policies.manage"]}>
      <AuthorizedGovernancePolicyConfigPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedGovernancePolicyConfigPage({
  policyId,
}: Readonly<{ policyId: string }>) {
  const policy = useGovernancePolicy(policyId);

  return (
    <>
      <PageHeader
        icon={SlidersHorizontal}
        eyebrow="Gobierno"
        title="Configuración de la política"
        description="Lo que rige hoy: append only, borrado, retención, masking, auditoría y aprobaciones."
        actions={
          <Link href={`/internal/governance/policies/${policyId}`}>
            <Button>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver al detalle
            </Button>
          </Link>
        }
      />
      <p
        className="mb-4 max-w-2xl text-sm text-atlas-muted"
        data-testid="policy-config-readonly-note"
      >
        Esta configuración no se edita desde el portal: AtlasBackend no publica
        una escritura de políticas por fila. Los cambios entran por el paquete
        de gobierno versionado y se ven aquí cuando se despliegan.
      </p>
      {policy.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {policy.error ? (
        <ErrorState
          description={
            isAtlasApiError(policy.error)
              ? policy.error.message
              : "No se pudo cargar la política."
          }
          requestId={
            isAtlasApiError(policy.error) ? policy.error.requestId : undefined
          }
          onRetry={() => void policy.refetch()}
        />
      ) : null}
      {policy.data ? <PolicyConfigSummary policy={policy.data} /> : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useGovernancePolicy,
  useUpdateGovernancePolicyMutation,
} from "./hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { PolicyConfigurationForm } from "./forms/policy-configuration-form";

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
  const router = useRouter();
  const policy = useGovernancePolicy(policyId);
  const mutation = useUpdateGovernancePolicyMutation(policyId);

  return (
    <>
      <PageHeader
        eyebrow="Formulario de gobierno"
        title="Configurar política"
        description="Define acciones operativas como append only, delete, retención, masking, auditoría y aprobaciones."
        actions={
          <Link href={`/internal/governance/policies/${policyId}`}>
            <Button>Volver al detalle</Button>
          </Link>
        }
      />
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
      {mutation.error ? (
        <ErrorState
          description={
            isAtlasApiError(mutation.error)
              ? mutation.error.message
              : "No se pudo guardar la política."
          }
          requestId={
            isAtlasApiError(mutation.error)
              ? mutation.error.requestId
              : undefined
          }
        />
      ) : null}
      {policy.data ? (
        <PolicyConfigurationForm
          policy={policy.data}
          isSaving={mutation.isPending}
          onSubmit={(values) =>
            mutation.mutate(values, {
              onSuccess: () =>
                router.push(`/internal/governance/policies/${policyId}`),
            })
          }
        />
      ) : null}
    </>
  );
}

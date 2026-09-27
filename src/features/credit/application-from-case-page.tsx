"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileSearch } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import {
  applicationCodeFromCaseCode,
  creditErrorMessage,
} from "./credit-rules";
import { useCustomerCreditApplications } from "./hooks";

/**
 * Del caso `CR-<código>` de la cola de trabajo a la solicitud que lo resuelve.
 *
 * El caso sólo guarda el cliente y el código de la solicitud, no su identificador; y el detalle
 * de operaciones se pide por identificador. Por eso se pasa por la lista de solicitudes del
 * cliente, se busca el código y se reemplaza la URL por la del detalle (el botón «atrás» vuelve a
 * la cola, no a esta página de paso).
 */
export function ApplicationFromCasePage({
  customerId,
  caseCode,
}: Readonly<{ customerId: string; caseCode: string }>) {
  const router = useRouter();
  const applicationCode = applicationCodeFromCaseCode(caseCode);
  const list = useCustomerCreditApplications(applicationCode ? customerId : "");
  const match = list.data?.applications.find(
    (application) => application.applicationCode === applicationCode,
  );

  useEffect(() => {
    if (match)
      router.replace(
        `/internal/operations/credit/applications/${match.applicationId}`,
      );
  }, [match, router]);

  const fichaHref = `/internal/operations/customers/${customerId}/investigation-summary`;

  return (
    <>
      <PageHeader
        icon={FileSearch}
        eyebrow="Crédito"
        title={`Caso ${caseCode || "sin código"}`}
        description="Buscando la solicitud de crédito que resuelve este caso de la cola de trabajo."
      />
      {!applicationCode || !customerId ? (
        <EmptyState
          title="Este caso no apunta a una solicitud de crédito."
          description="Sólo los casos «CR-…» con cliente se resuelven desde una solicitud. Vuelve a la cola de trabajo."
        />
      ) : null}
      {list.isLoading || match ? <LoadingSkeleton rows={3} /> : null}
      {list.error ? (
        <ErrorState
          description={creditErrorMessage(
            list.error,
            "No se pudieron cargar las solicitudes del cliente.",
          )}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.data && !match ? (
        <EmptyState
          title={`No encontramos la solicitud ${applicationCode}.`}
          description="Puede haberse retirado. Revisa el crédito del cliente en su ficha."
          action={
            <Link
              href={fichaHref}
              className="text-sm text-atlas-accent underline"
            >
              Abrir la ficha del cliente #{customerId}
            </Link>
          }
        />
      ) : null}
    </>
  );
}

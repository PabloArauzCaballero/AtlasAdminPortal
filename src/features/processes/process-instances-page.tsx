"use client";

import { ListChecks } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { useProcess, useProcessInstances } from "./hooks";
import { InstanceProgress } from "./instance-progress";
import { InstancesList, StatusCounts } from "./instances-list";
import { BackToProcesses } from "./process-detail-page";
import { PROCESSES_PERMISSION } from "./services";

const PAGE_SIZE = 25;

export function ProcessInstancesPage({ code }: Readonly<{ code: string }>) {
  return (
    <PermissionGate permissions={[PROCESSES_PERMISSION]}>
      <AuthorizedInstances code={code} />
    </PermissionGate>
  );
}

function AuthorizedInstances({ code }: Readonly<{ code: string }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // El caso abierto vive en la URL (`?caso=…`) para poder pasar el enlace a otra persona.
  const selected = searchParams.get("caso");
  const openInstance = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("caso", id);
      else params.delete("caso");
      router.replace(params.size ? `${pathname}?${params}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const process = useProcess(code);
  const instances = useProcessInstances(code, {
    status,
    search,
    page,
    pageSize: PAGE_SIZE,
  });
  const data = instances.data;

  return (
    <>
      <div className="mb-3">
        <BackToProcesses />
      </div>
      <PageHeader
        icon={ListChecks}
        eyebrow={process.data ? `Proceso ${process.data.processId}` : "Proceso"}
        title={
          process.data ? `Casos de «${process.data.name}»` : "Casos en curso"
        }
        description="Cuántos casos hay en cada estado y, al abrir uno, en qué etapa del proceso está."
      />
      {instances.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {instances.error ? (
        <ErrorState
          title="No se pudieron cargar los casos."
          description={
            isAtlasApiError(instances.error)
              ? instances.error.message
              : "Revisa la conexión y vuelve a intentarlo."
          }
          requestId={
            isAtlasApiError(instances.error)
              ? instances.error.requestId
              : undefined
          }
          onRetry={() => void instances.refetch()}
        />
      ) : null}
      {data && !data.supported ? (
        <EmptyState
          title="Los casos de este proceso no se ven desde aquí"
          description={`${data.reason} Este portal sólo cuenta los casos que viven en el núcleo de Atlas.`}
          action={<BackToProcesses />}
        />
      ) : null}
      {data?.supported ? (
        <>
          <StatusCounts
            byStatus={data.byStatus}
            active={status}
            onSelect={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <FilterBar
            search={search}
            searchPlaceholder="Buscar un caso por su código o identificador…"
            searchTooltip="Busca por el identificador exacto o por parte del código visible del caso."
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            onClear={() => {
              setSearch("");
              setStatus("");
              setPage(1);
            }}
          />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            <InstancesList
              data={data}
              selected={selected}
              onOpen={openInstance}
              onPageChange={setPage}
            />
            {selected ? (
              <InstanceProgress code={code} instanceId={selected} />
            ) : (
              <EmptyState
                title="Abre un caso para ver su avance"
                description="Pulsa «Ver avance» en cualquier fila: aquí aparecerán las etapas del proceso y en cuál está."
              />
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

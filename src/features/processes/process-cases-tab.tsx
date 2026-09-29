"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { useProcessInstances } from "./hooks";
import { InstanceProgress } from "./instance-progress";
import { InstancesList, StatusCounts } from "./instances-list";

const PAGE_SIZE = 25;

/**
 * La pestaña «Casos en curso» de la ficha de un proceso (antes `/procesos/[code]/instancias`).
 *
 * Cuántos casos hay en cada estado y, al abrir uno, en qué etapa está. El caso abierto vive en la
 * URL (`?caso=…`) junto a `?tab=casos`, así el enlace se puede pasar a otra persona.
 */
export function ProcessCasesTab({ code }: Readonly<{ code: string }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
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

  const instances = useProcessInstances(code, {
    status,
    search,
    page,
    pageSize: PAGE_SIZE,
  });
  const data = instances.data;

  return (
    <>
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
            onFilterChange={(_name, value) => {
              setStatus(value);
              setPage(1);
            }}
            onClear={() => {
              setSearch("");
              setStatus("");
              setPage(1);
            }}
            filters={[
              {
                name: "status",
                label: "Estado",
                value: status,
                tooltip:
                  "Deja sólo los casos en ese estado. Los estados y sus cuentas salen del servidor, sobre todos los casos del proceso.",
                options: data.byStatus.map((row) => ({
                  value: row.status,
                  label: row.status,
                  description: `${row.total} casos ${row.open ? "en curso" : "cerrados"} con este estado.`,
                })),
              },
            ]}
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

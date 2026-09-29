"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import type { Option } from "@/shared/lib/options";
import { useProviderRequests, useProviders } from "./hooks";
import { buildRequestColumns } from "./request-columns";
import { APROBACION_OPTIONS, DESENLACE_OPTIONS } from "./request-filters";

const PAGINA = 25;

/**
 * El listado de solicitudes: de aquí se copia el identificador que piden las acciones de al lado.
 *
 * Todo filtra en el servidor —búsqueda, proveedor, desenlace, aprobación, cliente y días— y la
 * tabla pagina con el total del filtro. Antes era una tabla propia con «Anteriores/Siguientes»,
 * sin buscador, y el backend ya aceptaba cliente y aprobación sin que la pantalla los ofreciera.
 */
export function RequestsListTab() {
  const [q, setQ] = useState("");
  const [providerCode, setProviderCode] = useState("");
  const [responseStatus, setResponseStatus] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const proveedores = useProviders();
  const cliente = customerId.trim();
  const query = useProviderRequests({
    q: q || undefined,
    providerCode: providerCode || undefined,
    responseStatus: responseStatus || undefined,
    approvalStatus: approvalStatus || undefined,
    customerId: /^\d+$/.test(cliente) ? cliente : undefined,
    days,
    limit: PAGINA,
    offset: (page - 1) * PAGINA,
  });
  const columns = useMemo(() => buildRequestColumns(), []);
  const proveedorOptions = useMemo<Option[]>(
    () =>
      (proveedores.data ?? []).map((proveedor) => ({
        value: proveedor.code,
        label: proveedor.name || proveedor.code,
        // sin-ayuda: catálogo de proveedores que devuelve el servidor, con su propia descripción
        description:
          proveedor.description ?? `Solicitudes hechas a ${proveedor.code}.`,
      })),
    [proveedores.data],
  );

  // Volver a la primera página al cambiar un filtro: quedarse en la 4 de un resultado de una
  // página enseña una tabla vacía que parece «no hay nada».
  const filtrar = (accion: () => void) => {
    accion();
    setPage(1);
  };
  const data = query.data;
  const meta = data
    ? (data.meta ?? {
        page,
        limit: data.limit,
        total: data.total,
        totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
      })
    : undefined;

  return (
    <div className="space-y-4">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por ID de solicitud, referencia del proveedor, tipo o error…"
        searchTooltip="Un número busca el ID exacto de la solicitud; un texto busca por partes en la referencia que dio el proveedor, el tipo de consulta y el mensaje de error."
        filters={[
          {
            name: "providerCode",
            label: "Proveedor",
            value: providerCode,
            options: proveedorOptions,
            tooltip: "Deja sólo las solicitudes hechas a ese proveedor.",
          },
          {
            name: "responseStatus",
            label: "Cómo acabó",
            value: responseStatus,
            options: DESENLACE_OPTIONS,
            tooltip:
              "Agrupa los desenlaces por lo que significan: problema, política, respuesta o caché.",
          },
          {
            name: "approvalStatus",
            label: "Aprobación",
            value: approvalStatus,
            options: APROBACION_OPTIONS,
            tooltip:
              "Deja sólo las que pasaron por una aprobación de administrador, y cómo.",
          },
        ]}
        onSearchChange={(valor) => filtrar(() => setQ(valor))}
        onFilterChange={(nombre, valor) =>
          filtrar(() => {
            if (nombre === "providerCode") setProviderCode(valor);
            if (nombre === "responseStatus") setResponseStatus(valor);
            if (nombre === "approvalStatus") setApprovalStatus(valor);
          })
        }
        onClear={() =>
          filtrar(() => {
            setQ("");
            setProviderCode("");
            setResponseStatus("");
            setApprovalStatus("");
            setCustomerId("");
            setDays(7);
          })
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:w-2/3">
        <Field
          label="Cliente (ID)"
          tooltip="El identificador interno del cliente consultado; sólo dígitos, otro texto no filtra."
        >
          <Input
            inputMode="numeric"
            value={customerId}
            onChange={(event) =>
              filtrar(() => setCustomerId(event.target.value))
            }
            placeholder="Ej: 1042"
          />
        </Field>
        <Field
          label="Últimos (días)"
          tooltip="Cuántos días hacia atrás se buscan solicitudes, de 1 a 90."
        >
          <Input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(event) =>
              filtrar(() =>
                setDays(
                  Math.min(90, Math.max(1, Number(event.target.value) || 7)),
                ),
              )
            }
          />
        </Field>
      </div>

      {query.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo cargar el listado de solicitudes."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {data ? (
        <DataTable
          data={data.requests}
          columns={columns}
          meta={meta}
          onPageChange={setPage}
          emptyTitle="No hay solicitudes que cumplan estos filtros en el período elegido."
          emptyDescription="Amplía los días o quita algún filtro."
        />
      ) : null}
    </div>
  );
}

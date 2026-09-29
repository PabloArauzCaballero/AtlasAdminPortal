"use client";

import { useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { apiErrorText, isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import type { Option } from "@/shared/lib/options";
import { useNotificationPolicies } from "./hooks";
import { buildPolicyColumns } from "./policy-columns";
import { PolicyEditor } from "./policy-editor";
import {
  ACTIVE_OPTIONS,
  CATEGORY_LABEL,
  CHANNELS,
  CHANNEL_LABEL,
  MANDATORY_OPTIONS,
  categoryLabel,
} from "./policy-labels";
import type {
  NotificationChannel,
  NotificationPolicy,
  NotificationPolicyQuery,
} from "./types";

const POR_PAGINA = 20;

type Filtros = {
  category: string;
  channel: NotificationChannel | "";
  mandatory: "true" | "false" | "";
  active: "true" | "false" | "";
};

const SIN_FILTROS: Filtros = {
  category: "",
  channel: "",
  mandatory: "",
  active: "",
};

/**
 * Qué avisos existen, cómo se llaman y cuáles no se pueden apagar.
 *
 * ## Por qué esta pantalla tenía que existir
 *
 * La app tenía una pantalla de «preferencias de avisos» que en la práctica no configuraba nada: la
 * lista salía vacía para quien nunca la había tocado, porque sólo enseñaba las filas ya guardadas —y
 * no había ninguna hasta que alguien guardara alguna—. Y lo más grave: el flag que marca un aviso
 * como irrenunciable llegaba EN LA PETICIÓN DEL CLIENTE. Bastaba mandarlo en `false` para poder
 * silenciar el aviso de mora, que es exactamente el que no se puede silenciar.
 *
 * Ahora ese flag se declara aquí, del lado del servidor, y el cliente sólo puede decir encendido o
 * apagado.
 *
 * ## Por qué el motivo es obligatorio
 *
 * Porque la app lo enseña junto al candado. Un interruptor bloqueado sin explicación se lee como
 * abuso; con el motivo delante, «no puedes apagarlo» se convierte en «no te conviene apagarlo, y por
 * esto». El backend rechaza guardar un aviso obligatorio sin él.
 *
 * ## Por qué es una tabla que pagina en el servidor
 *
 * Cada fila es una pareja aviso + canal, y el catálogo crece con cada aviso nuevo. El buscador, los
 * filtros y la página viajan al servidor, y las cifras salen de su resumen del catálogo ENTERO: no
 * cambian al buscar ni al pasar de página.
 */
export function NotificationPoliciesPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [editing, setEditing] = useState<NotificationPolicy | null>(null);

  const query: NotificationPolicyQuery = {
    page,
    limit: POR_PAGINA,
    q,
    ...filtros,
  };
  const policies = useNotificationPolicies(query);
  const columns = useMemo(() => buildPolicyColumns(setEditing), []);
  const summary = policies.data?.summary;
  const hayFiltros = q.trim() !== "" || Object.values(filtros).some(Boolean);

  // Las categorías salen del resumen del servidor —todas las que existen—, no de la página cargada,
  // que se autorrestringiría a lo que ya se filtró. Sin resumen (Core anterior) se ofrecen las conocidas.
  const categoryOptions = useMemo<Option[]>(() => {
    const known = summary
      ? summary.byCategory.map(({ category, count }) => ({
          value: category,
          label: categoryLabel(category),
          description: count === 1 ? "1 aviso" : `${count} avisos`,
        }))
      : Object.entries(CATEGORY_LABEL).map(([value, label]) => ({
          value,
          label,
        }));
    return known.some((option) => option.value === filtros.category) ||
      !filtros.category
      ? known
      : [
          ...known,
          { value: filtros.category, label: categoryLabel(filtros.category) },
        ];
  }, [summary, filtros.category]);

  const channelOptions = useMemo<Option[]>(
    () =>
      CHANNELS.map((channel) => {
        const count = summary?.byChannel[channel];
        return {
          value: channel,
          label: CHANNEL_LABEL[channel],
          description:
            count === undefined
              ? undefined
              : count === 1
                ? "1 aviso"
                : `${count} avisos`,
        };
      }),
    [summary],
  );

  return (
    <>
      <PageHeader
        icon={BellRing}
        eyebrow="Gobierno y calidad"
        title="Políticas de notificación"
        description="Qué avisos manda Atlas, cómo se llaman en la app del cliente y cuáles son irrenunciables."
      />

      {editing ? (
        <div className="mb-4">
          <PolicyEditor
            key={editing.policyId}
            policy={editing}
            onClose={() => setEditing(null)}
          />
        </div>
      ) : null}

      {summary ? (
        <section className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Políticas" value={formatNumber(summary.total)} />
          <MetricCard
            label="Irrenunciables"
            value={formatNumber(summary.mandatory)}
            hint="El cliente no puede apagarlas."
          />
          <MetricCard
            label="Activas"
            value={formatNumber(summary.active)}
            hint="Salen en la app."
          />
          <MetricCard
            label="Inactivas"
            value={formatNumber(summary.inactive)}
            hint="Guardadas, pero la app no las enseña."
          />
        </section>
      ) : null}

      <div className="space-y-4">
        <FilterBar
          search={q}
          searchPlaceholder="Buscar por código, nombre, categoría o explicación…"
          searchTooltip="Busca en el servidor, en todo el catálogo: coincide con parte del código del aviso, de su nombre, de su categoría o de su explicación."
          filters={[
            {
              name: "category",
              label: "Categoría",
              tooltip:
                "El grupo al que pertenece el aviso (pagos, seguridad…). Las opciones son las que existen en el catálogo.",
              value: filtros.category,
              options: categoryOptions,
            },
            {
              name: "channel",
              label: "Canal",
              tooltip:
                "Por dónde le llega el aviso al cliente. Un mismo aviso tiene una política por canal.",
              value: filtros.channel,
              options: channelOptions,
            },
            {
              name: "mandatory",
              label: "Obligatoria",
              tooltip:
                "Irrenunciables son las que el cliente no puede apagar (p. ej. el aviso de mora).",
              value: filtros.mandatory,
              options: MANDATORY_OPTIONS,
            },
            {
              name: "active",
              label: "Estado",
              tooltip:
                "Si la política sale hoy en la pantalla de avisos de la app o está guardada sin publicar.",
              value: filtros.active,
              options: ACTIVE_OPTIONS,
            },
          ]}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          onFilterChange={(name, value) => {
            setFiltros((actual) => ({ ...actual, [name]: value }));
            setPage(1);
          }}
          onClear={() => {
            setQ("");
            setFiltros(SIN_FILTROS);
            setPage(1);
          }}
        />

        {policies.isLoading ? <LoadingSkeleton rows={5} /> : null}

        {policies.error ? (
          <ErrorState
            title="No pudimos cargar las políticas"
            description={apiErrorText(
              policies.error,
              "Reintenta en unos segundos.",
            )}
            requestId={
              isAtlasApiError(policies.error)
                ? policies.error.requestId
                : undefined
            }
            onRetry={() => void policies.refetch()}
          />
        ) : null}

        {policies.data ? (
          <div data-testid="notification-policies-list">
            <DataTable
              data={policies.data.data}
              columns={columns}
              meta={policies.data.meta}
              onPageChange={setPage}
              emptyTitle={
                hayFiltros
                  ? "Ninguna política coincide con la búsqueda."
                  : "No hay políticas configuradas"
              }
              emptyDescription={
                hayFiltros
                  ? "Prueba con otro texto o quita algún filtro."
                  : "La pantalla de avisos de la app sale vacía. Aquí sólo se editan las políticas que ya existen: las de fábrica se cargan al desplegar, así que un catálogo vacío es un despliegue incompleto que hay que revisar."
              }
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

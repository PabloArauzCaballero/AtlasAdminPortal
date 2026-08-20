"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { FileText, RefreshCw, Table2, Terminal, Upload, X } from "lucide-react";
import { useLogFileUpload } from "./use-log-file-upload";
import { LogTerminal } from "./log-terminal";
import { parseBackendLogBlock } from "./backend-log-line";
import { useMongoLogs } from "@/features/systems/hooks";
import type { MongoLogEntry } from "@/features/systems/types";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Badge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { cn } from "@/shared/lib/cn";

const typeOptions = ["startup", "append", "rotation"].map((value) => ({
  label: value,
  value,
}));

/**
 * El tail de `Archivo.log` sincronizado a MongoDB, leído como un log y no como un volcado.
 *
 * Cada documento de Mongo agrupa VARIAS líneas del archivo en su campo `content`; antes se pintaba
 * ese campo entero dentro de un `<pre>`, así que la terminal enseñaba bloques de JSON pegados con
 * las llaves a la vista. Aquí los documentos se aplanan en la secuencia de líneas que realmente
 * son, se ordenan por hora y se entregan a `LogTerminal`, que ya sabe leerlas.
 */
export function MongoLogsSection() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [live, setLive] = useState(true);
  const [view, setView] = useState<"terminal" | "table">("terminal");
  const logs = useMongoLogs({ page, limit: 20, q, type }, { live });
  const upload = useLogFileUpload(() => setView("terminal"));

  const terminalLines = useMemo(() => {
    const entries = logs.data?.items ?? [];
    // Los documentos llegan de más reciente a más antiguo; el log se lee al revés.
    return parseBackendLogBlock(
      [...entries]
        .reverse()
        .map((entry) => entry.content ?? "")
        .join("\n"),
    );
  }, [logs.data?.items]);

  const uploadedLines = useMemo(
    () =>
      upload.uploadedLog
        ? parseBackendLogBlock(upload.uploadedLog.content)
        : [],
    [upload.uploadedLog],
  );

  const columns = useMemo<ColumnDef<MongoLogEntry>[]>(
    () => [
      {
        header: "Capturado",
        accessorKey: "capturedAt",
        cell: ({ row }) => formatDateTime(row.original.capturedAt),
      },
      {
        header: "Tipo",
        accessorKey: "type",
        cell: ({ row }) => <Badge tone="info">{row.original.type}</Badge>,
      },
      { header: "Servicio", accessorKey: "service" },
      {
        header: "Líneas",
        accessorKey: "lineCount",
        cell: ({ row }) => formatNumber(row.original.lineCount),
      },
      {
        header: "Bytes",
        accessorKey: "bytes",
        cell: ({ row }) => formatNumber(row.original.bytes),
      },
      {
        header: "Contenido",
        accessorKey: "content",
        cell: ({ row }) => (
          <pre className="atlas-scrollbar max-h-32 max-w-md overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 p-2 font-mono text-[11px] text-slate-100">
            {safeText(row.original.content)}
          </pre>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar en el contenido del log…"
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "type") setType(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setType("");
          setPage(1);
        }}
        filters={[
          { name: "type", label: "Tipo", value: type, options: typeOptions },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <ViewToggle view={view} onChange={setView} />
        <label className="inline-flex items-center gap-2 rounded-lg border border-atlas-border bg-white px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={live}
            onChange={(event) => setLive(event.target.checked)}
          />
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              live && "animate-spin text-emerald-600",
            )}
            aria-hidden
          />
          En vivo (10s)
        </label>
        <input
          ref={upload.fileInputRef}
          type="file"
          accept=".log,.txt,text/plain"
          className="hidden"
          onChange={upload.loadFile}
        />
        <Button
          variant="secondary"
          onClick={() => upload.fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden />
          Cargar Archivo.log
        </Button>
        <Button
          variant="ghost"
          isLoading={logs.isFetching}
          onClick={() => void logs.refetch()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refrescar
        </Button>
      </div>

      {upload.notice ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {upload.notice}
        </p>
      ) : null}

      {upload.uploadedLog ? (
        <LogTerminal
          title={`${upload.uploadedLog.name} · archivo local`}
          lines={uploadedLines}
          actions={
            <button
              type="button"
              onClick={upload.clear}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-3 w-3" aria-hidden />
              cerrar
            </button>
          }
        />
      ) : null}

      {logs.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {logs.error ? (
        <MongoLogsError
          error={logs.error}
          onRetry={() => void logs.refetch()}
        />
      ) : null}

      {logs.data && view === "terminal" ? (
        <LogTerminal
          title="atlas-backend — Archivo.log › mongo"
          lines={terminalLines}
          live={live}
          emptyText="Sin logs sincronizados en MongoDB para el filtro aplicado."
        />
      ) : null}
      {logs.data && view === "table" ? (
        <DataTable
          data={logs.data.items}
          columns={columns}
          meta={logs.data.meta}
          onPageChange={setPage}
          emptyTitle="Sin logs registrados en MongoDB para el filtro aplicado."
        />
      ) : null}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: Readonly<{
  view: "terminal" | "table";
  onChange: (value: "terminal" | "table") => void;
}>) {
  const options = [
    { key: "terminal" as const, label: "Terminal", Icon: Terminal },
    { key: "table" as const, label: "Documentos", Icon: Table2 },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-atlas-border bg-white text-sm">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={view === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 transition-colors",
            view === option.key
              ? "bg-slate-900 font-medium text-white"
              : "text-atlas-muted hover:bg-atlas-soft",
          )}
        >
          <option.Icon className="h-3.5 w-3.5" aria-hidden />
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * El 503 de este endpoint tiene UNA causa concreta y accionable, así que se dice cuál es en vez de
 * pintar el error genérico: el backend no tiene `MONGO_DB_URL_CONNECTION` y por tanto no hay
 * colección que leer. Antes esa explicación vivía en un párrafo permanente sobre la pantalla, que
 * es peor de las dos maneras: estorbaba cuando todo iba bien y no destacaba cuando fallaba.
 */
function MongoLogsError({
  error,
  onRetry,
}: Readonly<{ error: unknown; onRetry: () => void }>) {
  const apiError = isAtlasApiError(error) ? error : null;
  const notConfigured =
    apiError?.status === 503 || apiError?.message?.includes("MONGO");
  return (
    <ErrorState
      title={
        notConfigured
          ? "La sincronización de logs a MongoDB está apagada."
          : "No se pudieron cargar los logs de MongoDB."
      }
      description={
        notConfigured
          ? "El backend responde 503 MONGO_LOGS_NOT_CONFIGURED: sin MONGO_DB_URL_CONNECTION no hay colección que leer. Levanta el stack con `docker compose --profile app --profile logs up -d`. Mientras tanto, puedes cargar un Archivo.log a mano con el botón de arriba."
          : (apiError?.message ?? "Error desconocido.")
      }
      requestId={apiError?.requestId}
      onRetry={onRetry}
    />
  );
}

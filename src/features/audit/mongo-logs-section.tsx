"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useMongoLogs } from "@/features/systems/hooks";
import type { MongoLogEntry } from "@/features/systems/types";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Badge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

const typeOptions = ["startup", "append", "rotation"].map((value) => ({
  label: value,
  value,
}));

export function MongoLogsSection() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [live, setLive] = useState(true);
  const [view, setView] = useState<"terminal" | "table">("terminal");
  const [uploadedLog, setUploadedLog] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logs = useMongoLogs({ page, limit: 20, q, type }, { live });

  async function handleLoadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setUploadedLog({ name: file.name, content });
    setView("terminal");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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
      <p className="text-sm text-atlas-muted">
        Logs sincronizados desde <code>Archivo.log</code> hacia MongoDB (
        <code>{"GET /systems/logs/mongo"}</code>). Si el backend no tiene{" "}
        <code>MONGO_DB_URL_CONNECTION</code> configurado, esta sección devolverá
        un error 503 esperado.
      </p>
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
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex w-fit items-center gap-2 rounded-lg border border-atlas-border px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={live}
            onChange={(event) => setLive(event.target.checked)}
          />
          Actualizar en vivo cada 10s
        </label>
        <div className="inline-flex overflow-hidden rounded-lg border border-atlas-border text-sm">
          <button
            type="button"
            onClick={() => setView("terminal")}
            className={
              view === "terminal"
                ? "bg-slate-900 px-3 py-2 font-medium text-white"
                : "px-3 py-2 text-atlas-muted hover:bg-atlas-soft"
            }
          >
            Terminal
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={
              view === "table"
                ? "bg-slate-900 px-3 py-2 font-medium text-white"
                : "px-3 py-2 text-atlas-muted hover:bg-atlas-soft"
            }
          >
            Tabla
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".log,.txt,text/plain"
          className="hidden"
          onChange={handleLoadFile}
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Cargar Archivo.log
        </Button>
      </div>

      {uploadedLog ? (
        <UploadedLogTerminal
          name={uploadedLog.name}
          content={uploadedLog.content}
          onClear={() => setUploadedLog(null)}
        />
      ) : null}
      {logs.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {logs.error ? (
        <ErrorState
          description={
            isAtlasApiError(logs.error)
              ? logs.error.message
              : "No se pudo cargar logs de MongoDB."
          }
          requestId={
            isAtlasApiError(logs.error) ? logs.error.requestId : undefined
          }
          onRetry={() => void logs.refetch()}
        />
      ) : null}
      {logs.data && view === "terminal" ? (
        <TerminalLogView entries={logs.data.items} live={live} />
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

function UploadedLogTerminal({
  name,
  content,
  onClear,
}: Readonly<{ name: string; content: string; onClear: () => void }>) {
  const lines = useMemo(() => content.split(/\r?\n/), [content]);
  return (
    <div className="overflow-hidden rounded-lg border border-emerald-800 bg-slate-950 shadow-subtle">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2">
        <span className="h-3 w-3 rounded-full bg-red-500/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        <span className="ml-2 truncate font-mono text-xs text-emerald-300">
          {name} · {formatNumber(lines.length)} líneas
        </span>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-3 w-3" />
          cerrar
        </button>
      </div>
      <pre className="atlas-scrollbar max-h-[560px] overflow-auto p-4 font-mono text-xs leading-5 text-emerald-200">
        {highlightLog(content)}
      </pre>
    </div>
  );
}

// Colorea niveles de log comunes para que se lea como una terminal real.
function highlightLog(content: string) {
  return content.split(/\r?\n/).map((line, index) => {
    let tone = "text-emerald-200";
    if (/\b(ERROR|FATAL)\b/.test(line)) tone = "text-red-400";
    else if (/\bWARN(ING)?\b/.test(line)) tone = "text-amber-300";
    else if (/\bINFO\b/.test(line)) tone = "text-sky-300";
    else if (/\bDEBUG|TRACE\b/.test(line)) tone = "text-slate-400";
    return (
      <div key={index} className={tone}>
        {line || " "}
      </div>
    );
  });
}

function TerminalLogView({
  entries,
  live,
}: Readonly<{ entries: MongoLogEntry[]; live: boolean }>) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 text-center font-mono text-xs text-slate-500">
        Sin logs registrados en MongoDB para el filtro aplicado.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-subtle">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2">
        <span className="h-3 w-3 rounded-full bg-red-500/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        <span className="ml-2 font-mono text-xs text-slate-400">
          atlas — logs/mongo
        </span>
        {live ? (
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            live
          </span>
        ) : null}
      </div>
      <div className="atlas-scrollbar max-h-[560px] overflow-auto p-4 font-mono text-xs leading-5">
        {entries.map((entry) => (
          <div key={entry.id} className="mb-3 last:mb-0">
            <div className="text-slate-500">
              <span className="text-sky-400">
                {formatDateTime(entry.capturedAt)}
              </span>{" "}
              <span className="text-fuchsia-400">
                {entry.service ?? "service"}
              </span>
              <span className="text-slate-600">:</span>{" "}
              <span className="text-amber-400">{entry.type}</span>
              <span className="text-slate-600">
                {" "}
                ({formatNumber(entry.lineCount)} líneas)
              </span>
            </div>
            <pre className="whitespace-pre-wrap break-words text-emerald-200">
              {safeText(entry.content)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

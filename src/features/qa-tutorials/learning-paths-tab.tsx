"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { GraduationCap } from "lucide-react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Button } from "@/shared/components/ui/button";
import { tutorialCatalog } from "./catalog";
import {
  learningPaths,
  pathTutorials,
  type LearningPath,
} from "./learning-paths";
import { buildTutorialColumns } from "./tutorial-columns";
import {
  filterTutorials,
  LEVEL_OPTIONS,
  STATUS_OPTIONS,
} from "./tutorial-filter";
import { TutorialObjectiveLauncher } from "./tutorial-objective-launcher";
import { useTutorial } from "./tutorial-provider";

const MODULES = [...new Set(tutorialCatalog.map((t) => t.module))].map(
  (name) => ({
    value: name,
    // Los módulos son nombres propios de las pantallas del portal: van sin descripción.
    label: name,
    description: `Tutoriales de la pantalla «${name}».`,
  }),
);

/** Pestaña «Recorridos»: descubrir, buscar y retomar tutoriales. Tu avance se guarda en este navegador. */
export function LearningPaths() {
  return (
    <div className="space-y-8">
      <TutorialObjectiveLauncher />
      <SuggestedPaths />
      <AllTutorials />
    </div>
  );
}

function SuggestedPaths() {
  const { startPath } = useTutorial();
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [...learningPaths];
    return [...learningPaths].filter((path) =>
      [
        path.title,
        path.summary,
        ...pathTutorials(path).map((tutorial) => tutorial.title),
      ].some((text) => text.toLowerCase().includes(needle)),
    );
  }, [q]);
  const columns = useMemo<ColumnDef<LearningPath>[]>(
    () => [
      {
        id: "path",
        header: "Recorrido",
        accessorFn: (path) => path.title,
        cell: ({ row }) => (
          <div className="min-w-[14rem] max-w-md">
            <p className="font-medium text-atlas-text">{row.original.title}</p>
            <p className="mt-1 text-xs leading-5 text-atlas-muted">
              {row.original.summary}
            </p>
          </div>
        ),
      },
      {
        id: "count",
        header: "Tutoriales",
        accessorFn: (path) => pathTutorials(path).length,
        cell: ({ row }) => (
          <span className="tabular-nums text-xs">
            {pathTutorials(row.original).length} tutoriales
          </span>
        ),
      },
      {
        id: "chain",
        header: "Orden",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-md text-xs text-atlas-muted">
            {pathTutorials(row.original)
              .map((tutorial) => tutorial.title)
              .join(" → ")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        meta: { pinRight: true },
        cell: ({ row }) =>
          pathTutorials(row.original).length > 0 ? (
            <Button
              variant="secondary"
              className="h-8 whitespace-nowrap px-2.5 text-xs"
              aria-label={`Empezar recorrido ${row.original.title}`}
              onClick={() => startPath(row.original.id)}
            >
              Empezar recorrido
            </Button>
          ) : null,
      },
    ],
    [startPath],
  );
  return (
    <section className="space-y-3" aria-label="Recorridos sugeridos">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-atlas-accent" aria-hidden />
        <h2 className="text-base font-semibold text-atlas-text">
          Recorridos sugeridos
        </h2>
      </div>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar recorrido…"
        searchTooltip="Recorre los recorridos sugeridos, que están definidos en el portal y se cargan enteros: coincide con parte del nombre, del resumen o del título de alguno de sus tutoriales."
        onSearchChange={setQ}
        onClear={() => setQ("")}
      />
      <DataTable
        data={visible}
        columns={columns}
        emptyTitle="Ningún recorrido coincide con la búsqueda."
        emptyDescription="Cambia el texto de la búsqueda."
      />
    </section>
  );
}

function AllTutorials() {
  const { start, statusFor, percentFor } = useTutorial();
  const [q, setQ] = useState("");
  const [module, setModule] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const visible = useMemo(
    () =>
      filterTutorials(tutorialCatalog, { q, module, level, status }, statusFor),
    [q, module, level, status, statusFor],
  );
  const columns = useMemo(
    () => buildTutorialColumns({ start, statusFor, percentFor }),
    [start, statusFor, percentFor],
  );
  return (
    <section className="space-y-3" aria-label="Todos los tutoriales">
      <h2 className="text-base font-semibold text-atlas-text">
        Todos los tutoriales
      </h2>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar tutorial…"
        searchTooltip="Recorre el catálogo completo de tutoriales, que está en el portal y se carga entero: coincide con parte del título, de la descripción, del nombre de la herramienta o del objetivo."
        filters={[
          {
            name: "module",
            label: "Pantalla",
            tooltip: "Deja sólo los tutoriales de una pantalla del portal.",
            value: module,
            options: MODULES,
          },
          {
            name: "level",
            label: "Nivel",
            tooltip: "Cuánto conocimiento previo supone el tutorial.",
            value: level,
            options: LEVEL_OPTIONS,
          },
          {
            name: "status",
            label: "Estado",
            tooltip: "Tu avance en este navegador: empezados, terminados, etc.",
            value: status,
            options: STATUS_OPTIONS,
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(name, value) => {
          if (name === "module") setModule(value);
          if (name === "level") setLevel(value);
          if (name === "status") setStatus(value);
        }}
        onClear={() => {
          setQ("");
          setModule("");
          setLevel("");
          setStatus("");
        }}
      />
      <DataTable
        data={visible}
        columns={columns}
        emptyTitle="Ningún tutorial coincide con la búsqueda."
        emptyDescription="Cambia el texto o quita algún filtro."
      />
    </section>
  );
}

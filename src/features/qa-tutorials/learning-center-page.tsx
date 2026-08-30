"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/page-header";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { tutorialCatalog } from "./catalog";
import { learningPaths, pathTutorials } from "./learning-paths";
import { TutorialListCard } from "./tutorial-list-card";
import { TutorialObjectiveLauncher } from "./tutorial-objective-launcher";
import { useTutorial } from "./tutorial-provider";

const ALL = "Todos";

/** Centro de aprendizaje de QA LAB: descubrir, buscar y retomar tutoriales. */
export function LearningCenterPage() {
  return (
    <PermissionGate permissions={["systems.endpoints.read", "systems.qa.read"]}>
      <AuthorizedLearningCenter />
    </PermissionGate>
  );
}

function AuthorizedLearningCenter() {
  const { start } = useTutorial();
  const [query, setQuery] = useState("");
  const [module, setModule] = useState(ALL);

  const modules = useMemo(
    () => [ALL, ...new Set(tutorialCatalog.map((t) => t.module))],
    [],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tutorialCatalog.filter((t) => {
      const matchesModule = module === ALL || t.module === module;
      const matchesQuery =
        !needle ||
        `${t.title} ${t.description} ${t.tool} ${t.goal ?? ""}`
          .toLowerCase()
          .includes(needle);
      return matchesModule && matchesQuery;
    });
  }, [query, module]);

  return (
    <>
      <PageHeader
        eyebrow="QA Console"
        title="Centro de aprendizaje"
        description="Aprende QA LAB paso a paso: elige un objetivo, sigue un recorrido sugerido o retoma donde lo dejaste. Todo interactivo y a tu ritmo."
        actions={
          <Link href="/internal/qa/lab">
            <Button variant="primary">Abrir el lab</Button>
          </Link>
        }
      />

      <div className="space-y-8">
        <TutorialObjectiveLauncher />

        <section>
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-atlas-accent" aria-hidden />
            <h2 className="text-base font-semibold text-atlas-text">
              Recorridos sugeridos
            </h2>
          </div>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {learningPaths.map((path) => {
              const steps = pathTutorials(path);
              const first = steps[0];
              return (
                <div
                  key={path.id}
                  className="rounded-2xl border border-atlas-border bg-white p-4 shadow-subtle"
                >
                  <h3 className="text-sm font-semibold text-atlas-text">
                    {path.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-atlas-muted">
                    {path.summary}
                  </p>
                  <p className="mt-2 text-[0.6875rem] text-atlas-muted">
                    {steps.length} tutoriales ·{" "}
                    {steps.map((s) => s.title).join(" → ")}
                  </p>
                  {first ? (
                    <Button
                      variant="secondary"
                      className="mt-3"
                      onClick={() => start(first.id)}
                    >
                      Empezar recorrido
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-atlas-text">
              Todos los tutoriales
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar tutorial…"
                  aria-label="Buscar tutorial"
                  className="h-9 w-56 rounded-lg border border-atlas-border bg-white pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
                />
              </label>
              <select
                value={module}
                onChange={(event) => setModule(event.target.value)}
                aria-label="Filtrar por módulo"
                className="h-9 rounded-lg border border-atlas-border bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
              >
                {modules.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-atlas-muted">
              No hay tutoriales que coincidan con «{query}».
            </p>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((tutorial) => (
                <TutorialListCard key={tutorial.id} tutorial={tutorial} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

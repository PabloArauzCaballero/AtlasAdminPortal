"use client";

import { Select } from "@/shared/components/ui/input";
import { FieldTooltip } from "@/shared/components/ui/field-tooltip";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { QaLabGuide } from "@/features/qa-lab/guide/qa-lab-guide-page";
import Link from "next/link";
import { GraduationCap, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/page-header";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { useAuth } from "@/shared/auth/auth-context";
import { tutorialCatalog } from "./catalog";
import { learningPaths, pathTutorials } from "./learning-paths";
import { TutorialListCard } from "./tutorial-list-card";
import { TutorialObjectiveLauncher } from "./tutorial-objective-launcher";
import { useTutorial } from "./tutorial-provider";

const ALL = "Todos";

const PATHS_TAB = "Recorridos";
const GUIDE_TAB = "Guía de referencia";
/** `?tab=guia` es el destino de la ruta vieja «Guía QA Lab». */
const GUIDE_SLUG = "guia";
/** Mismos permisos que tenía cada pantalla antes de unirlas. */
const PATHS_PERMISSIONS = ["systems.endpoints.read", "systems.qa.read"];
const GUIDE_PERMISSIONS = ["systems.endpoints.read"];

/**
 * «Aprender QA Lab»: los recorridos guiados y la guía de referencia, antes dos
 * ítems del menú («Centro de aprendizaje» y «Guía QA Lab»).
 */
export function LearningCenterPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { permissions } = useAuth();
  // La guía pide un permiso más estrecho que los recorridos: sin él, ni pestaña.
  const canReadGuide = GUIDE_PERMISSIONS.some((permission) =>
    permissions.includes(permission),
  );
  const active =
    canReadGuide && params.get("tab") === GUIDE_SLUG ? GUIDE_TAB : PATHS_TAB;
  const selectTab = (tab: string) => {
    router.replace(
      tab === GUIDE_TAB ? `${pathname}?tab=${GUIDE_SLUG}` : pathname,
      { scroll: false },
    );
  };
  return (
    <PermissionGate permissions={PATHS_PERMISSIONS}>
      <PageHeader
        eyebrow="QA Console"
        title="Aprender QA Lab"
        description="Aprende QA LAB paso a paso con recorridos guiados sobre las pantallas reales, o consulta la guía de referencia: cómo probar la API como si fueras el negocio y qué barreras impiden romper producción."
        actions={
          <Link href="/internal/qa/lab">
            <Button variant="primary">Abrir el lab</Button>
          </Link>
        }
      />
      <DetailTabs
        tabs={canReadGuide ? [PATHS_TAB, GUIDE_TAB] : [PATHS_TAB]}
        active={active}
        onChange={selectTab}
      />
      {active === GUIDE_TAB ? (
        <PermissionGate permissions={GUIDE_PERMISSIONS}>
          <QaLabGuide />
        </PermissionGate>
      ) : (
        <PermissionGate permissions={PATHS_PERMISSIONS}>
          <LearningPaths />
        </PermissionGate>
      )}
    </PermissionGate>
  );
}

/** Pestaña «Recorridos»: descubrir, buscar y retomar tutoriales. Tu avance se guarda en este navegador. */
function LearningPaths() {
  const { startPath } = useTutorial();
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
                      onClick={() => startPath(path.id)}
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
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar tutorial…"
                  aria-label="Buscar tutorial"
                  className="h-9 w-56 rounded-lg border border-atlas-border bg-white pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
                />
              </div>
              {/* Los módulos son nombres propios de las pantallas del portal: van sin descripción. */}
              <Select
                name="modulo"
                compact
                ariaLabel="Filtrar por módulo"
                className="w-48"
                value={module}
                onChange={setModule}
                options={modules.map((name) => ({ value: name, label: name }))}
              />
              <FieldTooltip
                label="Filtrar por módulo"
                text="Deja sólo los tutoriales de una pantalla del portal."
              />
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

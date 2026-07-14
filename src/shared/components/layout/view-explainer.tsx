"use client";

import { BookOpenText, ChevronDown, Cpu, Landmark } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { resolveExplanation } from "@/shared/content/view-explanations";
import { cn } from "@/shared/lib/cn";

/**
 * Panel de contexto montado en el shell: para cada vista resuelve la explicación
 * de su módulo y de la vista misma en dos planos — negocio y sistemas — desde el
 * registro central `view-explanations`. Colapsado por defecto para no robar
 * espacio; recuerda el estado por sesión de navegación.
 */
export function ViewExplainer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Al navegar a otra vista se colapsa para no tapar el contenido nuevo.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const resolved = pathname ? resolveExplanation(pathname) : null;
  if (!resolved) return null;

  return (
    <section className="mb-4 animate-fade-in overflow-hidden rounded-xl border border-atlas-border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-atlas-soft"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm text-atlas-muted">
          <BookOpenText className="h-4 w-4 shrink-0 text-atlas-accent" />
          <span className="truncate">
            <span className="font-semibold text-atlas-text">
              {resolved.module.module}
            </span>{" "}
            — qué es este módulo y esta vista (negocio y sistemas)
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-atlas-muted transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-4 border-t border-atlas-border px-4 py-4 md:grid-cols-2">
            <ExplanationBlock
              icon={Landmark}
              tone="business"
              title="Explicación de negocio"
              moduleText={resolved.module.business}
              viewText={resolved.view?.business ?? null}
            />
            <ExplanationBlock
              icon={Cpu}
              tone="systems"
              title="Explicación de sistemas"
              moduleText={resolved.module.systems}
              viewText={resolved.view?.systems ?? null}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ExplanationBlock({
  icon: Icon,
  tone,
  title,
  moduleText,
  viewText,
}: Readonly<{
  icon: typeof Landmark;
  tone: "business" | "systems";
  title: string;
  moduleText: string;
  viewText: string | null;
}>) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "business"
          ? "border-amber-200 bg-amber-50/60"
          : "border-sky-200 bg-sky-50/60",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide",
          tone === "business" ? "text-amber-800" : "text-sky-800",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <p className="mt-2 text-xs leading-5 text-atlas-text">
        <span className="font-semibold">Módulo:</span> {moduleText}
      </p>
      {viewText ? (
        <p className="mt-2 text-xs leading-5 text-atlas-text">
          <span className="font-semibold">Esta vista:</span> {viewText}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Portal } from "@/shared/components/ui/portal";
import { Tooltip } from "@/shared/components/ui/tooltip";
import { AssistPanel } from "./assist-panel";
import { assistScreenFor } from "./screen-label";
import { useAssist } from "./use-assist";

/**
 * El botón flotante de Atlas Assist, abajo a la derecha de toda pantalla con sesión.
 *
 * ## Dónde se monta y por qué
 *
 * En `AppShell`, una sola vez y FUERA del `<main>`: el shell sólo se pinta con sesión (el login y
 * la recuperación de acceso no lo usan), y el `<main>` se remonta en cada navegación, así que
 * dentro perdería la conversación al cambiar de pantalla. Va por `Portal` a `document.body` por lo
 * mismo que los diálogos: el `main` animado crea su propio contexto de apilamiento.
 *
 * ## Apilamiento
 *
 * `z-[25]`: por encima del contenido y de la barra superior (`z-20`, que además está arriba), por
 * debajo del cajón de navegación móvil (`z-30`/`z-40`), de los diálogos (`z-50`) y del tutorial
 * (`z-[100]`). Mientras hay un diálogo abierto el velo lo tapa y queda inerte, como todo el fondo.
 *
 * ## Siempre visible
 *
 * No se esconde aunque el asistente esté apagado en el ambiente (404): lo explica el panel.
 */
export function AssistFab() {
  const pathname = usePathname();
  const assist = useAssist();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const screen = useMemo(() => assistScreenFor(pathname), [pathname]);

  return (
    <>
      <Portal>
        <Tooltip text="Pregúntale cómo usar el portal: pantallas, estados y pasos de cada tarea.">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Asistente de Atlas"
            aria-haspopup="dialog"
            aria-expanded={open}
            data-testid="assist-fab"
            className="atlas-press fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-[25] flex h-12 items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/60 focus-visible:ring-offset-2 sm:right-6"
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Asistente</span>
          </button>
        </Tooltip>
      </Portal>
      <AssistPanel
        open={open}
        onClose={close}
        screen={screen}
        assist={assist}
      />
    </>
  );
}

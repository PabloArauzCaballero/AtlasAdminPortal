"use client";

import { useCallback, useEffect, useState } from "react";
import { getTutorial } from "./catalog";
import { learningPaths } from "./learning-paths";
import {
  readPathQueue,
  writePathQueue,
  type PathQueue,
} from "./progress-storage";

/**
 * Encadena los tutoriales de un recorrido sugerido. Antes «Empezar recorrido» arrancaba sólo el
 * primero aunque la tarjeta anunciara «A → B → C»: al terminar A no pasaba nada. Ahora, al
 * terminar cada uno, la tarjeta de «completado» ofrece el siguiente.
 */
export function usePathQueue(startTutorial: (tutorialId: string) => void) {
  const [queue, setQueue] = useState<PathQueue | null>(null);

  useEffect(() => {
    setQueue(readPathQueue());
  }, []);

  const save = useCallback((next: PathQueue | null) => {
    setQueue(next);
    writePathQueue(next);
  }, []);

  const startPath = useCallback(
    (pathId: string) => {
      const path = learningPaths.find((item) => item.id === pathId);
      const ids = (path?.tutorialIds ?? []).filter((id) => getTutorial(id));
      if (!path || ids.length === 0) return;
      startTutorial(ids[0]);
      save({ pathId, title: path.title, remaining: ids.slice(1) });
    },
    [startTutorial, save],
  );

  const next = queue?.remaining[0]
    ? getTutorial(queue.remaining[0])
    : undefined;

  const continuePath = useCallback(() => {
    if (!queue || !next) return;
    save({ ...queue, remaining: queue.remaining.slice(1) });
    startTutorial(next.id);
  }, [queue, next, save, startTutorial]);

  const clearPath = useCallback(() => save(null), [save]);

  return {
    startPath,
    continuePath,
    clearPath,
    pathTitle: queue?.title ?? null,
    nextTitle: next?.title ?? null,
  };
}

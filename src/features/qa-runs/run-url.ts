"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * La corrida que se está mirando vive en la URL (`?runId=`), no en un `useState`: tras un F5, o
 * al compartir el enlace, se vuelve a la misma corrida. Como la corrida se ejecuta en el servidor,
 * recargar no la interrumpe; sólo hay que volver a leerla.
 */
export function useRunIdParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const runId = params.get("runId");
  const setRunId = useCallback(
    (next: string | null) => {
      const query = new URLSearchParams(params.toString());
      if (next) query.set("runId", next);
      else query.delete("runId");
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
  return { runId, setRunId };
}

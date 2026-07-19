"use client";

import { useCallback, useRef, useState } from "react";
import { newIdempotencyKey } from "@/shared/api/idempotency";

/**
 * Combina las dos capas de UI contra la doble ejecución de una mutación:
 * - un guard local (`isSubmitting`) que ignora clics mientras hay uno en curso;
 * - una llave de idempotencia estable por acción (ver ADR 0008) que se pasa al
 *   `action` y solo se **rota tras un envío exitoso**. Si el envío falla, la
 *   siguiente llamada reusa la misma llave: es el mismo intento lógico y el
 *   backend debe deduplicarlo.
 */
export function useIdempotentSubmit<T>(
  action: (idempotencyKey: string) => Promise<T>,
): {
  submit: () => Promise<T | undefined>;
  isSubmitting: boolean;
} {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const keyRef = useRef<string>(newIdempotencyKey());
  const inFlightRef = useRef(false);

  const submit = useCallback(async (): Promise<T | undefined> => {
    // Guard síncrono con ref: evita la carrera de dos clics en el mismo tick,
    // antes de que el estado se re-renderice.
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await action(keyRef.current);
      keyRef.current = newIdempotencyKey(); // próxima acción = llave nueva
      return result;
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [action]);

  return { submit, isSubmitting };
}

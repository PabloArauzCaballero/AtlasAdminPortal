import { z } from "zod";

/** Mínimo para que la nota sirva como rastro de auditoría y no como relleno. */
export const MIN_RESOLUTION_NOTES_LENGTH = 10;

/**
 * Validación del cierre de un issue de calidad. La nota es obligatoria (≥10) a
 * propósito: cada cierre queda en la auditoría del issue, así que no puede ser
 * relleno vacío ni un dato inventado por el formulario.
 */
export const resolutionSchema = z.object({
  /**
   * `acknowledged` («Reconocer») era un botón aparte en la pantalla «Alertas», sin motivo ni notas, y
   * después «Cerrar» respondía 409. Ahora es una resolución más, con motivo y notas, que NO cierra:
   * la incidencia sigue pendiente (cuenta en el semáforo de salida) hasta corregirla o descartarla.
   */
  resolution: z.enum(["acknowledged", "resolved", "ignored"]),
  reasonCode: z.string().trim().min(1, "Selecciona un motivo."),
  notes: z
    .string()
    .trim()
    .min(
      MIN_RESOLUTION_NOTES_LENGTH,
      `Describe la resolución (mín. ${MIN_RESOLUTION_NOTES_LENGTH} caracteres).`,
    ),
});

export type ResolutionForm = z.infer<typeof resolutionSchema>;

export const resolutionDefaults: ResolutionForm = {
  resolution: "resolved",
  reasonCode: "manual_review",
  notes: "",
};

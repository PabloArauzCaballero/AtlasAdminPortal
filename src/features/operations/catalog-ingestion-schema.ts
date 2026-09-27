import { z } from "zod";
import {
  codeField,
  jsonRecordTextField,
  optionalPattern,
} from "./catalog-schema-primitives";

/**
 * Replica `catalogIngestionSchema` del backend. Igual que el resto de los
 * esquemas del módulo vive fuera del componente para poder probarlo suelto.
 *
 * Ingerir deja los valores pendientes de revisión en staging; la revisión (listado y decisión en
 * lote) vive en `catalog-staging-panel.tsx`.
 */

const OPTIONAL_CODE = optionalPattern(
  /^[a-zA-Z0-9_.:-]{2,140}$/,
  "Solo letras, números y los signos _ . : - (2 a 140).",
);

export const ingestionItemFormSchema = z.object({
  rawValue: z
    .string()
    .trim()
    .min(1, "El valor crudo es obligatorio.")
    .max(500, "Máximo 500 caracteres."),
  normalizedValue: OPTIONAL_CODE,
  itemType: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(80, "Máximo 80 caracteres."),
  confidenceScore: optionalPattern(
    /^\d{1,3}(\.\d{1,2})?$/,
    "Hasta 3 enteros y 2 decimales (ej: 85.5).",
  ),
  /** `rawPayload` viaja como objeto JSON; el formulario lo edita como texto. */
  rawPayloadText: jsonRecordTextField,
  aiSuggested: z.boolean(),
});

export const catalogIngestionFormSchema = z.object({
  catalogCode: codeField,
  sourceType: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(60, "Máximo 60 caracteres."),
  sourceName: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(160, "Máximo 160 caracteres."),
  sourceCode: OPTIONAL_CODE,
  items: z
    .array(ingestionItemFormSchema)
    .min(1, "La ingesta necesita al menos un item.")
    .max(1000, "Máximo 1000 items por ingesta."),
});

export type IngestionItemForm = z.infer<typeof ingestionItemFormSchema>;
export type CatalogIngestionForm = z.infer<typeof catalogIngestionFormSchema>;

export const emptyIngestionItemForm: IngestionItemForm = {
  rawValue: "",
  normalizedValue: "",
  itemType: "",
  confidenceScore: "",
  rawPayloadText: "{}",
  aiSuggested: false,
};

export function emptyCatalogIngestionForm(
  catalogCode: string,
): CatalogIngestionForm {
  return {
    catalogCode,
    sourceType: "",
    sourceName: "",
    sourceCode: "",
    items: [emptyIngestionItemForm],
  };
}

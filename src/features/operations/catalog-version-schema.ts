import { z } from "zod";
import {
  codeField,
  jsonRecordTextField,
  optionalLength,
  optionalPattern,
} from "./catalog-schema-primitives";

/**
 * Fuente única de la validación del ciclo de vida de versiones de catálogo.
 * Vive fuera de los componentes para poder probar las reglas sin montar la
 * pantalla y para que los formularios no revaliden "a mano" con ifs sueltos.
 *
 * Replica `createCatalogVersionSchema`, `submitCatalogVersionSchema` y
 * `catalogDecisionSchema` de `catalog-management.schemas.ts`. Los mínimos de
 * `notes` (3) y `decisionReason` (5) son del backend y se validan acá a
 * propósito: son el rastro de auditoría de la aprobación, así que el formulario
 * los exige al operador en vez de inventar un texto por defecto.
 */

const OPTIONAL_DATE = optionalPattern(
  /^\d{4}-\d{2}-\d{2}$/,
  "Debe ser una fecha YYYY-MM-DD.",
);

export const aliasFormSchema = z.object({
  aliasValue: z
    .string()
    .trim()
    .min(1, "El alias es obligatorio.")
    .max(220, "Máximo 220 caracteres."),
  aliasType: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(60, "Máximo 60 caracteres."),
  confidenceScore: optionalPattern(
    /^\d{1,3}(\.\d{1,2})?$/,
    "Hasta 3 enteros y 2 decimales (ej: 85.5).",
  ),
});

export const riskMappingFormSchema = z.object({
  riskDimension: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(60, "Máximo 60 caracteres."),
  riskBand: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(40, "Máximo 40 caracteres."),
  scorePointsSuggested: optionalPattern(
    /^-?\d{1,6}(\.\d{1,2})?$/,
    "Hasta 6 enteros y 2 decimales (ej: -12.5).",
  ),
  reasonCode: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(100, "Máximo 100 caracteres."),
  explanation: optionalLength(1, 2000, "Máximo 2000 caracteres."),
  modelUsage: optionalLength(2, 80, "Entre 2 y 80 caracteres."),
  validFrom: OPTIONAL_DATE,
  validUntil: OPTIONAL_DATE,
});

export const catalogItemFormSchema = z.object({
  itemCode: codeField,
  itemName: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(220, "Máximo 220 caracteres."),
  itemType: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(80, "Máximo 80 caracteres."),
  sourceCode: optionalPattern(
    /^[a-zA-Z0-9_.:-]{2,140}$/,
    "Solo letras, números y los signos _ . : - (2 a 140).",
  ),
  confidenceScore: optionalPattern(
    /^\d{1,3}(\.\d{1,2})?$/,
    "Hasta 3 enteros y 2 decimales (ej: 85.5).",
  ),
  /** `attributes` viaja como objeto JSON; el formulario lo edita como texto. */
  attributesText: jsonRecordTextField,
  aliases: z.array(aliasFormSchema).max(50, "Máximo 50 alias por item."),
  riskMappings: z
    .array(riskMappingFormSchema)
    .max(50, "Máximo 50 mapeos de riesgo por item."),
});

export const createCatalogVersionFormSchema = z.object({
  versionCode: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(60, "Máximo 60 caracteres."),
  validFrom: OPTIONAL_DATE,
  validUntil: OPTIONAL_DATE,
  notes: optionalLength(1, 4000, "Máximo 4000 caracteres."),
  items: z
    .array(catalogItemFormSchema)
    .min(1, "Una versión necesita al menos un item.")
    .max(500, "Máximo 500 items por versión."),
});

export const submitCatalogVersionFormSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(
      3,
      "Obligatorio: mínimo 3 caracteres. Queda en el registro de aprobación.",
    )
    .max(2000, "Máximo 2000 caracteres."),
});

export const CATALOG_DECISIONS = [
  "approve",
  "reject",
  "publish",
  "retire",
] as const;

export const catalogDecisionFormSchema = z.object({
  decision: z.enum(CATALOG_DECISIONS),
  decisionReason: z
    .string()
    .trim()
    .min(
      5,
      "Obligatorio: mínimo 5 caracteres. Queda en el registro de aprobación.",
    )
    .max(3000, "Máximo 3000 caracteres."),
  validFrom: OPTIONAL_DATE,
  validUntil: OPTIONAL_DATE,
});

export type AliasForm = z.infer<typeof aliasFormSchema>;
export type RiskMappingForm = z.infer<typeof riskMappingFormSchema>;
export type CatalogItemForm = z.infer<typeof catalogItemFormSchema>;
export type CreateCatalogVersionForm = z.infer<
  typeof createCatalogVersionFormSchema
>;
export type SubmitCatalogVersionForm = z.infer<
  typeof submitCatalogVersionFormSchema
>;
export type CatalogDecisionForm = z.infer<typeof catalogDecisionFormSchema>;
export type CatalogDecision = (typeof CATALOG_DECISIONS)[number];

export const emptyAliasForm: AliasForm = {
  aliasValue: "",
  aliasType: "common_name",
  confidenceScore: "",
};

export const emptyRiskMappingForm: RiskMappingForm = {
  riskDimension: "",
  riskBand: "",
  scorePointsSuggested: "",
  reasonCode: "",
  explanation: "",
  modelUsage: "",
  validFrom: "",
  validUntil: "",
};

export const emptyCatalogItemForm: CatalogItemForm = {
  itemCode: "",
  itemName: "",
  itemType: "",
  sourceCode: "",
  confidenceScore: "",
  attributesText: "{}",
  aliases: [],
  riskMappings: [],
};

export const emptyCreateCatalogVersionForm: CreateCatalogVersionForm = {
  versionCode: "",
  validFrom: "",
  validUntil: "",
  notes: "",
  items: [emptyCatalogItemForm],
};

import { z } from "zod";
import type {
  NewColumnInput,
  NewRelationshipInput,
  ProposeSchemaTableInput,
} from "./types";

export const emptyColumn: NewColumnInput = {
  columnName: "",
  columnType: "bigint",
  isNullable: false,
  isImmutable: false,
  isPii: false,
  isIndexed: false,
};

export const emptyRelationship: NewRelationshipInput = {
  sourceColumnName: "",
  targetTableName: "",
  targetColumnName: "_id",
  cascadeDelete: false,
};

const columnSchema = z.object({
  columnName: z.string().trim().min(1, "Nombre de columna obligatorio."),
  columnType: z.string().trim().min(1, "Tipo obligatorio."),
  isNullable: z.boolean(),
  isImmutable: z.boolean(),
  isPii: z.boolean(),
  isIndexed: z.boolean(),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
});

const relationshipSchema = z.object({
  sourceColumnName: z.string(),
  targetTableName: z.string(),
  targetColumnName: z.string(),
  cascadeDelete: z.boolean(),
});

/**
 * Fuente única de validación de la propuesta de tabla. Reemplaza el `canSubmit`
 * inline: el `handleSubmit` de rhf no dispara la mutación si esto no pasa, así
 * que no hay forma de proponer una tabla sin nombre, sin justificación o con una
 * columna a medio llenar.
 */
export const proposeTableSchema = z.object({
  tableName: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres.")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "snake_case: minúsculas, números y guion bajo.",
    ),
  tableType: z.enum(["transactional", "catalog", "audit", "operational"]),
  isAppendOnly: z.boolean(),
  isTenantScoped: z.boolean(),
  description: z.string(),
  columns: z.array(columnSchema).min(1, "Agrega al menos una columna."),
  relationships: z.array(relationshipSchema),
  justification: z
    .string()
    .trim()
    .min(10, "Mínimo 10 caracteres: por qué se necesita esta tabla."),
});

export type ProposeTableForm = z.infer<typeof proposeTableSchema>;

export const proposeTableDefaults: ProposeTableForm = {
  tableName: "",
  tableType: "operational",
  isAppendOnly: false,
  isTenantScoped: true,
  description: "",
  columns: [{ ...emptyColumn }],
  relationships: [],
  justification: "",
};

/**
 * Traduce el formulario al payload del backend: descripción vacía → undefined y
 * se descartan las relaciones a medio llenar (una fila añadida y no completada
 * no debe viajar como relación real).
 */
export function toProposeTableInput(
  values: ProposeTableForm,
): ProposeSchemaTableInput {
  return {
    tableName: values.tableName.trim(),
    tableType: values.tableType,
    isAppendOnly: values.isAppendOnly,
    isTenantScoped: values.isTenantScoped,
    description: values.description.trim() || undefined,
    columns: values.columns,
    relationships: values.relationships.filter(
      (relationship) =>
        relationship.sourceColumnName.trim() &&
        relationship.targetTableName.trim(),
    ),
    justification: values.justification.trim(),
  };
}

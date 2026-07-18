import { z } from "zod";
import type { DataEntityMetadataInput } from "@/features/systems/types";

/**
 * Validación de la metadata de tabla. Lo que de verdad protege son las reglas
 * cruzadas de gobierno: hoy el formulario deja guardar combinaciones
 * incoherentes (permitir hard-delete con los deletes apagados, o marcar
 * append-only y a la vez permitir updates), y esa config es la que el servicio
 * interno obedece de verdad sobre la tabla. Un gobierno inconsistente es peor
 * que un 400: puede terminar habilitando en runtime algo que el operador creía
 * prohibido.
 */
const governanceSchema = z.object({
  mutationMode: z.string().min(1),
  appendOnly: z.boolean(),
  updatesAllowed: z.boolean(),
  deletesAllowed: z.boolean(),
  hardDeleteAllowed: z.boolean(),
  approvalRequired: z.boolean(),
  notes: z.string(),
});

export const entityMetadataSchema = z
  .object({
    entityName: z
      .string()
      .trim()
      .min(1, "El nombre de negocio es obligatorio."),
    businessPurpose: z.string(),
    dataOwner: z.string(),
    module: z.string(),
    retentionPolicyCode: z.string(),
    status: z.string(),
    containsPii: z.boolean(),
    containsFinancialData: z.boolean(),
    containsRiskData: z.boolean(),
    containsLegalData: z.boolean(),
    containsDeviceData: z.boolean(),
    containsLocationData: z.boolean(),
    isAuditCritical: z.boolean(),
    governance: governanceSchema,
  })
  .superRefine((value, ctx) => {
    const g = value.governance;
    // No se puede hard-delete si ni siquiera se permiten los deletes normales.
    if (g.hardDeleteAllowed && !g.deletesAllowed) {
      ctx.addIssue({
        code: "custom",
        path: ["governance", "hardDeleteAllowed"],
        message:
          "Incoherente: no se puede permitir hard-delete si los deletes están deshabilitados.",
      });
    }
    // Append-only excluye por definición updates y deletes.
    if (g.appendOnly && g.updatesAllowed) {
      ctx.addIssue({
        code: "custom",
        path: ["governance", "updatesAllowed"],
        message: "Append-only no puede permitir actualizaciones.",
      });
    }
    if (g.appendOnly && g.deletesAllowed) {
      ctx.addIssue({
        code: "custom",
        path: ["governance", "deletesAllowed"],
        message: "Append-only no puede permitir eliminaciones.",
      });
    }
  });

export type EntityMetadataForm = z.infer<typeof entityMetadataSchema>;

/** Primer problema de validación en texto legible, o `null` si todo es coherente. */
export function firstMetadataError(
  values: DataEntityMetadataInput,
): string | null {
  const result = entityMetadataSchema.safeParse(values);
  return result.success ? null : result.error.issues[0].message;
}

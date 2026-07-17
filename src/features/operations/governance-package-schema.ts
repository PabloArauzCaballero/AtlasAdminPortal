import { z } from "zod";
import {
  codeField,
  jsonRecordSchema,
  positiveIdField,
} from "./catalog-schema-primitives";

/**
 * Réplica cliente de `dataGovernancePolicyPackageSchema` del backend: 6 arrays
 * (propósitos, retenciones, proveedores, clasificaciones, reglas de campos
 * sensibles y reglas de calidad) de 200 a 500 elementos cada uno.
 *
 * Como los otros paquetes, valida el JSON del editor con la forma exacta del
 * body en vez de un formulario aplanado.
 */

const confidenceLike = z.string().regex(/^\d{1,3}(\.\d{1,2})?$/);

export const dataGovernancePolicyPackageSchema = z.object({
  privacyPurposes: z
    .array(
      z.object({
        purposeCode: codeField,
        purposeName: z.string().min(1).max(180),
        legalBasis: z.string().min(2).max(160).optional(),
        description: z.string().max(2000).optional(),
        requiresExplicitConsent: z.boolean().optional().default(false),
      }),
    )
    .max(200)
    .optional()
    .default([]),
  retentionPolicies: z
    .array(
      z.object({
        policyCode: codeField,
        appliesTo: z.string().min(2).max(80),
        retentionDays: z.number().int().positive(),
        postRetentionAction: z.string().min(2).max(40),
        legalBasis: z.string().min(2).max(180).optional(),
        description: z.string().max(2000).optional(),
      }),
    )
    .max(200)
    .optional()
    .default([]),
  dataProviders: z
    .array(
      z.object({
        providerCode: codeField,
        providerName: z.string().min(1).max(180),
        providerType: z.string().min(2).max(60),
        reliabilityScore: confidenceLike.optional(),
        supportsRetroData: z.boolean().optional().default(false),
        defaultRetentionPolicyId: positiveIdField.optional(),
      }),
    )
    .max(200)
    .optional()
    .default([]),
  classificationPolicies: z
    .array(
      z.object({
        classificationCode: codeField,
        classificationName: z.string().min(1).max(160),
        sensitivityLevel: z.string().min(2).max(40),
        allowedStorageModes: jsonRecordSchema.optional().default({}),
        defaultStorageMode: z.string().min(2).max(40).optional(),
        defaultRetentionPolicyId: positiveIdField.optional(),
        encryptionRequired: z.boolean().optional().default(false),
        hashingRequired: z.boolean().optional().default(false),
        rawStorageAllowed: z.boolean().optional().default(false),
        description: z.string().max(2000).optional(),
      }),
    )
    .max(200)
    .optional()
    .default([]),
  sensitiveFieldRules: z
    .array(
      z.object({
        tableName: z.string().min(2).max(120),
        fieldName: z.string().min(2).max(120),
        classificationCode: codeField,
        storageMode: z.string().min(2).max(40),
        searchStrategy: z.string().min(2).max(40).optional(),
        maskingStrategy: z.string().min(2).max(40).optional(),
        accessPolicyCode: codeField.optional(),
        retentionPolicyId: positiveIdField.optional(),
      }),
    )
    .max(500)
    .optional()
    .default([]),
  dataQualityRules: z
    .array(
      z.object({
        ruleCode: codeField,
        ruleName: z.string().min(1).max(180),
        targetTable: z.string().min(2).max(120),
        targetField: z.string().min(2).max(120).optional(),
        severity: z.string().min(2).max(40),
        expressionJson: jsonRecordSchema,
        expectedAction: z.string().min(2).max(80),
        buildPhase: z.string().min(2).max(40).optional(),
      }),
    )
    .max(500)
    .optional()
    .default([]),
});

export type DataGovernancePolicyPackageInput = z.infer<
  typeof dataGovernancePolicyPackageSchema
>;

/** Plantilla mínima válida para arrancar el editor sin adivinar la forma. */
export const governancePackageTemplate = JSON.stringify(
  {
    privacyPurposes: [
      {
        purposeCode: "risk.scoring",
        purposeName: "Evaluación de riesgo crediticio",
        legalBasis: "Ejecución de contrato",
        requiresExplicitConsent: false,
      },
    ],
    retentionPolicies: [],
    dataProviders: [],
    classificationPolicies: [],
    sensitiveFieldRules: [],
    dataQualityRules: [],
  },
  null,
  2,
);

import type {
  DataEntity,
  DataEntityMetadataInput,
  DataEntityStatus,
} from "@/features/systems/types";
import type { Option } from "@/shared/lib/options";

/**
 * Lo que el formulario edita: exactamente los campos que `PATCH /systems/data-entities/:id/metadata`
 * guarda. Antes el formulario mandaba además nombre de negocio, módulo y un bloque `governance`
 * (modo de mutación, append only, hard delete…) que el servidor no admite: su esquema es estricto y
 * TODO guardado respondía 400 «Entrada inválida en body».
 */
export type EntityMetadataFormValues = {
  businessPurpose: string;
  dataOwner: string;
  retentionPolicyCode: string;
  status: string;
  reviewStatus: string;
  containsPii: boolean;
  containsFinancialData: boolean;
  containsRiskData: boolean;
  containsLegalData: boolean;
  containsDeviceData: boolean;
  containsLocationData: boolean;
  isAuditCritical: boolean;
};

export const BOOLEAN_FIELDS = [
  ["containsPii", "Datos personales"],
  ["containsFinancialData", "Datos financieros"],
  ["containsRiskData", "Datos de riesgo"],
  ["containsLegalData", "Datos legales"],
  ["containsDeviceData", "Datos de dispositivo"],
  ["containsLocationData", "Datos de ubicación"],
  ["isAuditCritical", "Auditoría crítica"],
] as const satisfies ReadonlyArray<
  readonly [keyof EntityMetadataFormValues, string]
>;

export const statusOptions: Option[] = [
  { value: "ACTIVE", label: "Activa", description: "La tabla está en uso." },
  {
    value: "DISABLED",
    label: "Deshabilitada",
    description: "Existe pero no se usa.",
  },
  {
    value: "DEPRECATED_CANDIDATE",
    label: "Candidata a retirar",
    description: "Se propone retirarla; aún puede tener uso.",
  },
  {
    value: "DEPRECATED",
    label: "Retirada",
    description: "Ya no debe usarse.",
  },
];

export const reviewStatusOptions: Option[] = [
  {
    value: "AUTO_DETECTED",
    label: "Detectada automáticamente",
    description: "La encontró el sistema; nadie la revisó.",
  },
  {
    value: "NEEDS_REVIEW",
    label: "Necesita revisión",
    description: "Hay que confirmar su ficha.",
  },
  {
    value: "APPROVED",
    label: "Aprobada",
    description: "La ficha está revisada.",
  },
  {
    value: "REJECTED",
    label: "Rechazada",
    description: "La ficha no es correcta.",
  },
];

export function metadataValuesFrom(
  entity: DataEntity,
): EntityMetadataFormValues {
  return {
    businessPurpose: entity.businessPurpose ?? "",
    dataOwner: entity.dataOwner ?? "",
    retentionPolicyCode: entity.retentionPolicyCode ?? "",
    status: (entity.status ?? "ACTIVE").toUpperCase(),
    reviewStatus: (entity.reviewStatus ?? "").toUpperCase(),
    containsPii: Boolean(entity.containsPii),
    containsFinancialData: Boolean(entity.containsFinancialData),
    containsRiskData: Boolean(entity.containsRiskData),
    containsLegalData: Boolean(entity.containsLegalData),
    containsDeviceData: Boolean(entity.containsDeviceData),
    containsLocationData: Boolean(entity.containsLocationData),
    isAuditCritical: Boolean(entity.isAuditCritical),
  };
}

/**
 * El cuerpo del PATCH: sólo lo que CAMBIÓ respecto de la tabla cargada, recortado, y nunca una
 * cadena vacía (el servidor exige un mínimo de caracteres). Una retención borrada se manda como
 * `null`, que es como el servidor la quita.
 */
export function metadataPatch(
  entity: DataEntity,
  values: EntityMetadataFormValues,
): DataEntityMetadataInput {
  const original = metadataValuesFrom(entity);
  const patch: DataEntityMetadataInput = {};
  const purpose = values.businessPurpose.trim();
  if (purpose && purpose !== original.businessPurpose.trim())
    patch.businessPurpose = purpose;
  const owner = values.dataOwner.trim();
  if (owner && owner !== original.dataOwner.trim()) patch.dataOwner = owner;
  const retention = values.retentionPolicyCode.trim();
  if (retention !== original.retentionPolicyCode.trim())
    patch.retentionPolicyCode = retention || null;
  if (values.status !== original.status)
    patch.status = values.status as DataEntityStatus;
  if (values.reviewStatus && values.reviewStatus !== original.reviewStatus)
    patch.reviewStatus = values.reviewStatus;
  for (const [field] of BOOLEAN_FIELDS) {
    if (values[field] !== original[field]) patch[field] = values[field];
  }
  return patch;
}

/** Primer problema en texto legible, o `null`. Son las mismas reglas que aplica el servidor. */
export function firstMetadataError(
  entity: DataEntity,
  values: EntityMetadataFormValues,
): string | null {
  const purpose = values.businessPurpose.trim();
  if (entity.businessPurpose?.trim() && !purpose)
    return "El propósito de negocio no se puede dejar vacío.";
  if (purpose && purpose.length < 3)
    return "El propósito de negocio necesita al menos 3 caracteres.";
  const owner = values.dataOwner.trim();
  if (entity.dataOwner?.trim() && !owner)
    return "El responsable no se puede dejar vacío.";
  if (owner && owner.length < 2)
    return "El responsable necesita al menos 2 caracteres.";
  const retention = values.retentionPolicyCode.trim();
  if (retention && retention.length < 2)
    return "El código de retención necesita al menos 2 caracteres.";
  if (!statusOptions.some((option) => option.value === values.status))
    return "Elige un estado válido.";
  return null;
}

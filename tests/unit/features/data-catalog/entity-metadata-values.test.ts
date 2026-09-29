import { describe, expect, it } from "vitest";
import {
  firstMetadataError,
  metadataPatch,
  metadataValuesFrom,
} from "@/features/data-catalog/forms/entity-metadata-values";
import type { DataEntity } from "@/features/systems/types";

/**
 * «Configurar tabla» respondía SIEMPRE 400: mandaba nombre de negocio, módulo, un bloque
 * `governance` y cadenas vacías a un esquema estricto que no los admite. Ahora el cuerpo lleva sólo
 * los campos que el servidor guarda, sólo si cambiaron y nunca vacíos.
 */
const ENTITY: DataEntity = {
  entityId: "7",
  schemaName: "credit",
  tableName: "loans",
  modelName: null,
  entityName: "Préstamos",
  module: "credit",
  businessPurpose: "Los créditos desembolsados",
  dataOwner: "riesgo",
  containsPii: false,
  containsFinancialData: true,
  containsRiskData: false,
  containsLegalData: false,
  containsDeviceData: false,
  containsLocationData: false,
  isAuditCritical: false,
  retentionPolicyCode: "RET_5Y",
  status: "ACTIVE",
  detectedFrom: null,
  confidenceLevel: null,
  reviewStatus: "NEEDS_REVIEW",
};

/** Las claves que admite `updateDataEntityMetadataSchema` (AtlasBackend), que es `.strict()`. */
const ADMITIDAS = new Set([
  "businessPurpose",
  "dataOwner",
  "containsPii",
  "containsFinancialData",
  "containsRiskData",
  "containsLegalData",
  "containsDeviceData",
  "containsLocationData",
  "isAuditCritical",
  "retentionPolicyCode",
  "status",
  "reviewStatus",
]);

describe("metadataPatch", () => {
  it("sin cambios no manda nada", () => {
    expect(metadataPatch(ENTITY, metadataValuesFrom(ENTITY))).toEqual({});
  });

  it("manda sólo lo que cambió, recortado, y nunca un campo que el servidor rechace", () => {
    const values = {
      ...metadataValuesFrom(ENTITY),
      dataOwner: "  cobranza ",
      containsPii: true,
      reviewStatus: "APPROVED",
    };
    const patch = metadataPatch(ENTITY, values);
    expect(patch).toEqual({
      dataOwner: "cobranza",
      containsPii: true,
      reviewStatus: "APPROVED",
    });
    for (const key of Object.keys(patch)) expect(ADMITIDAS.has(key)).toBe(true);
  });

  it("una retención borrada viaja como null (así la quita el servidor), nunca como cadena vacía", () => {
    const values = { ...metadataValuesFrom(ENTITY), retentionPolicyCode: "  " };
    expect(metadataPatch(ENTITY, values)).toEqual({
      retentionPolicyCode: null,
    });
  });

  it("el estado llega en el formato del servidor aunque la tabla lo traiga en minúsculas", () => {
    const values = metadataValuesFrom({ ...ENTITY, status: "active" });
    expect(values.status).toBe("ACTIVE");
    expect(metadataPatch({ ...ENTITY, status: "active" }, values)).toEqual({});
  });
});

describe("firstMetadataError — las mismas reglas que el servidor, antes de enviar", () => {
  it("no deja vaciar el propósito ni el responsable", () => {
    const base = metadataValuesFrom(ENTITY);
    expect(
      firstMetadataError(ENTITY, { ...base, businessPurpose: "" }),
    ).toMatch(/propósito/);
    expect(firstMetadataError(ENTITY, { ...base, dataOwner: " " })).toMatch(
      /responsable/,
    );
  });

  it("exige los mínimos de longitud", () => {
    const base = metadataValuesFrom(ENTITY);
    expect(
      firstMetadataError(ENTITY, { ...base, businessPurpose: "ab" }),
    ).toMatch(/3 caracteres/);
    expect(
      firstMetadataError(ENTITY, { ...base, retentionPolicyCode: "R" }),
    ).toMatch(/2 caracteres/);
    expect(firstMetadataError(ENTITY, base)).toBeNull();
  });
});

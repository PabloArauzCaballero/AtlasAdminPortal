import { describe, expect, it } from "vitest";
import {
  entityMetadataSchema,
  firstMetadataError,
} from "@/features/data-catalog/forms/entity-metadata-schema";
import type { DataEntityMetadataInput } from "@/features/systems/types";

function metadata(
  governance: Partial<DataEntityMetadataInput["governance"]> = {},
  overrides: Partial<DataEntityMetadataInput> = {},
): DataEntityMetadataInput {
  return {
    entityName: "Clientes",
    businessPurpose: "",
    dataOwner: "",
    module: "",
    retentionPolicyCode: "",
    status: "active",
    containsPii: false,
    containsFinancialData: false,
    containsRiskData: false,
    containsLegalData: false,
    containsDeviceData: false,
    containsLocationData: false,
    isAuditCritical: false,
    governance: {
      mutationMode: "mutable",
      appendOnly: false,
      updatesAllowed: true,
      deletesAllowed: true,
      hardDeleteAllowed: false,
      approvalRequired: false,
      notes: "",
      ...governance,
    },
    ...overrides,
  };
}

describe("entityMetadataSchema · campos base", () => {
  it("acepta una metadata coherente", () => {
    expect(entityMetadataSchema.safeParse(metadata()).success).toBe(true);
  });

  it("exige nombre de negocio", () => {
    expect(
      entityMetadataSchema.safeParse(metadata({}, { entityName: "  " }))
        .success,
    ).toBe(false);
  });
});

describe("entityMetadataSchema · consistencia de gobierno", () => {
  it("rechaza hard-delete con deletes deshabilitados", () => {
    const result = entityMetadataSchema.safeParse(
      metadata({ deletesAllowed: false, hardDeleteAllowed: true }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual([
        "governance",
        "hardDeleteAllowed",
      ]);
    }
  });

  it("permite hard-delete cuando los deletes están habilitados", () => {
    expect(
      entityMetadataSchema.safeParse(
        metadata({ deletesAllowed: true, hardDeleteAllowed: true }),
      ).success,
    ).toBe(true);
  });

  it("rechaza append-only con updates permitidos", () => {
    const result = entityMetadataSchema.safeParse(
      metadata({
        appendOnly: true,
        updatesAllowed: true,
        deletesAllowed: false,
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rechaza append-only con deletes permitidos", () => {
    const result = entityMetadataSchema.safeParse(
      metadata({
        appendOnly: true,
        updatesAllowed: false,
        deletesAllowed: true,
      }),
    );
    expect(result.success).toBe(false);
  });

  it("acepta append-only puro (sin updates ni deletes)", () => {
    expect(
      entityMetadataSchema.safeParse(
        metadata({
          appendOnly: true,
          updatesAllowed: false,
          deletesAllowed: false,
        }),
      ).success,
    ).toBe(true);
  });
});

describe("firstMetadataError", () => {
  it("devuelve null cuando todo es coherente", () => {
    expect(firstMetadataError(metadata())).toBeNull();
  });

  it("devuelve el mensaje de la primera incoherencia", () => {
    const message = firstMetadataError(
      metadata({ deletesAllowed: false, hardDeleteAllowed: true }),
    );
    expect(message).toMatch(/hard-delete/i);
  });

  it("prioriza el nombre obligatorio cuando falta", () => {
    const message = firstMetadataError(metadata({}, { entityName: "" }));
    expect(message).toMatch(/nombre de negocio/i);
  });
});

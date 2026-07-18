import { describe, expect, it } from "vitest";
import {
  proposeTableDefaults,
  proposeTableSchema,
  toProposeTableInput,
} from "@/features/schema-management/propose-table-schema";

const validForm = {
  ...proposeTableDefaults,
  tableName: "customer_watchlist",
  justification: "Necesaria para registrar entradas de watchlist.",
  columns: [{ ...proposeTableDefaults.columns[0], columnName: "id" }],
};

describe("proposeTableSchema", () => {
  it("acepta un formulario completo válido", () => {
    expect(proposeTableSchema.safeParse(validForm).success).toBe(true);
  });

  it("rechaza un nombre que no es snake_case", () => {
    const result = proposeTableSchema.safeParse({
      ...validForm,
      tableName: "CustomerWatchlist",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un nombre demasiado corto", () => {
    expect(
      proposeTableSchema.safeParse({ ...validForm, tableName: "ab" }).success,
    ).toBe(false);
  });

  it("exige una justificación de al menos 10 caracteres", () => {
    expect(
      proposeTableSchema.safeParse({ ...validForm, justification: "corta" })
        .success,
    ).toBe(false);
  });

  it("exige al menos una columna", () => {
    expect(
      proposeTableSchema.safeParse({ ...validForm, columns: [] }).success,
    ).toBe(false);
  });

  it("rechaza una columna sin nombre", () => {
    const result = proposeTableSchema.safeParse({
      ...validForm,
      columns: [{ ...validForm.columns[0], columnName: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza una columna sin tipo", () => {
    const result = proposeTableSchema.safeParse({
      ...validForm,
      columns: [{ ...validForm.columns[0], columnType: "" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("toProposeTableInput", () => {
  it("convierte descripción vacía en undefined", () => {
    const input = toProposeTableInput({ ...validForm, description: "   " });
    expect(input.description).toBeUndefined();
  });

  it("conserva una descripción con contenido", () => {
    const input = toProposeTableInput({ ...validForm, description: "hola" });
    expect(input.description).toBe("hola");
  });

  it("descarta relaciones a medio llenar", () => {
    const input = toProposeTableInput({
      ...validForm,
      relationships: [
        {
          sourceColumnName: "customer_id",
          targetTableName: "customers",
          targetColumnName: "_id",
          cascadeDelete: false,
        },
        {
          // fila añadida y no completada: no debe viajar
          sourceColumnName: "",
          targetTableName: "",
          targetColumnName: "_id",
          cascadeDelete: false,
        },
      ],
    });
    expect(input.relationships).toHaveLength(1);
    expect(input.relationships[0].targetTableName).toBe("customers");
  });

  it("recorta el nombre de tabla y la justificación", () => {
    const input = toProposeTableInput({
      ...validForm,
      tableName: "  customer_watchlist  ",
      justification: "  Justificación con espacios sobrantes.  ",
    });
    expect(input.tableName).toBe("customer_watchlist");
    expect(input.justification).toBe("Justificación con espacios sobrantes.");
  });
});

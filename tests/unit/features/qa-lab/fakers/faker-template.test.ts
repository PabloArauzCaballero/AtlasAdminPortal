import { describe, expect, it } from "vitest";
import {
  hasTemplateMarkers,
  resolveFakerTemplate,
} from "@/features/qa-lab/fakers/faker-template";
import { fakeCase } from "../faker-fixtures";

const context = fakeCase(0);

describe("resolveFakerTemplate", () => {
  it("un marcador que ocupa todo el valor conserva el tipo", () => {
    const { value, missing } = resolveFakerTemplate(
      {
        lat: "{{faker.caso.direccion.latitude}}",
        income: "{{faker.caso.perfilFinanciero.monthlyIncome}}",
        rooted: "{{faker.caso.dispositivo.snapshot.isRooted}}",
        snapshot: "{{faker.caso.dispositivo.snapshot}}",
        amount: "{{ faker.monto.amount }}",
      },
      context,
    );
    expect(value).toEqual({
      lat: -16.5,
      income: 4000,
      rooted: false,
      snapshot: { brand: "Samsung", isRooted: false },
      amount: 150.5,
    });
    expect(missing).toEqual([]);
  });

  it("dentro de un texto se sustituye como texto", () => {
    const { value } = resolveFakerTemplate(
      {
        note: "Alta de {{faker.caso.persona.firstName}} ({{faker.caso.persona.age}} años)",
      },
      context,
    );
    expect(value.note).toBe("Alta de Nombre0 (35 años)");
  });

  it("recorre listas y objetos anidados sin tocar lo que no es marcador", () => {
    const { value } = resolveFakerTemplate(
      { consents: [{ granted: true, at: "{{qa.now}}" }], id: "1", n: 3 },
      context,
      { now: "2026-09-26T00:00:00.000Z" },
    );
    expect(value).toEqual({
      consents: [{ granted: true, at: "2026-09-26T00:00:00.000Z" }],
      id: "1",
      n: 3,
    });
  });

  it("un marcador que no existe se deja tal cual y se informa", () => {
    const { value, missing } = resolveFakerTemplate(
      {
        a: "{{faker.caso.persona.nope}}",
        b: "{{faker.otro.x}}",
        c: "{{refreshToken}}",
      },
      context,
    );
    expect(value).toEqual({
      a: "{{faker.caso.persona.nope}}",
      b: "{{faker.otro.x}}",
      c: "{{refreshToken}}",
    });
    expect(missing).toEqual([
      "faker.caso.persona.nope",
      "faker.otro.x",
      "refreshToken",
    ]);
  });

  it("el objeto devuelto es una copia: editarlo no cambia el lote", () => {
    const { value } = resolveFakerTemplate(
      { snapshot: "{{faker.caso.dispositivo.snapshot}}" },
      context,
    );
    (value.snapshot as unknown as Record<string, unknown>).brand = "otra";
    expect(
      (context.caso?.dispositivo as { snapshot: { brand: string } }).snapshot
        .brand,
    ).toBe("Samsung");
  });

  it("hasTemplateMarkers detecta marcadores a cualquier profundidad", () => {
    expect(
      hasTemplateMarkers({ a: [{ b: "{{faker.caso.persona.email}}" }] }),
    ).toBe(true);
    expect(hasTemplateMarkers({ a: "{{refreshToken}}" })).toBe(false);
  });
});

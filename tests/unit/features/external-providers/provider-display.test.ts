import { describe, expect, it } from "vitest";
import { esMedido } from "@/features/external-providers-admin/provider-columns";
import { etiquetaDeModo } from "@/features/external-providers-admin/provider-badges";
import {
  ETIQUETA_DE_TRAMO,
  etiquetaTipoConsulta,
  leerJsonObjeto,
  modoEfectivo,
  modoFijadoPorEntorno,
  opcionesDeTipoDeConsulta,
  tipoDeConsultaDePrueba,
} from "@/features/external-providers-admin/provider-display";

/**
 * Lo que la pantalla de proveedores afirma.
 *
 * En TEST los ocho proveedores tenían `mock_local` en la base y la API los ejecutaba en
 * `mock_server` por el entorno: la tabla pintaba un modo que no era el que corría y, con él,
 * decidía mal si la salud estaba medida.
 */
describe("modoEfectivo", () => {
  it("manda el modo de la sonda de salud sobre el guardado", () => {
    expect(
      modoEfectivo({
        defaultMode: "mock_local",
        health: { mode: "mock_server" },
      }),
    ).toBe("mock_server");
  });

  it("sin sonda, cae al modo guardado", () => {
    expect(modoEfectivo({ defaultMode: "mock_local" })).toBe("mock_local");
    expect(
      modoEfectivo({ defaultMode: "sandbox", health: { mode: "  " } }),
    ).toBe("sandbox");
  });

  it("con el modo efectivo, una sonda por red cuenta como medida aunque tarde 0 ms", () => {
    const fila = { defaultMode: "mock_local", health: { mode: "mock_server" } };
    expect(esMedido(modoEfectivo(fila), 0)).toBe(true);
    expect(esMedido("mock_local", 0)).toBe(false);
  });
});

describe("modoFijadoPorEntorno", () => {
  it("devuelve el modo del entorno sólo cuando difiere del guardado", () => {
    expect(modoFijadoPorEntorno("mock_local", "mock_server")).toBe(
      "mock_server",
    );
    expect(modoFijadoPorEntorno("mock_server", "MOCK_SERVER")).toBeNull();
    expect(modoFijadoPorEntorno("mock_local", undefined)).toBeNull();
    expect(modoFijadoPorEntorno("mock_local", null)).toBeNull();
  });
});

describe("etiquetas", () => {
  it("traduce los tipos de consulta conocidos y deja el resto tal cual", () => {
    expect(etiquetaTipoConsulta("IDENTITY_VERIFICATION")).toBe(
      "Verificación de identidad",
    );
    expect(etiquetaTipoConsulta("credit_report")).toBe(
      "Informe de buró de crédito",
    );
    expect(etiquetaTipoConsulta("ALGO_NUEVO")).toBe("ALGO_NUEVO");
    expect(etiquetaTipoConsulta(null)).toBe("—");
  });

  it("los tramos de costo y los modos no se enseñan en crudo", () => {
    expect(ETIQUETA_DE_TRAMO.CRITICAL).toBe("Costo crítico");
    expect(etiquetaDeModo("mock_server")).toBe("Simulado servidor");
    expect(etiquetaDeModo("raro")).toBe("raro");
  });
});

describe("leerJsonObjeto", () => {
  it("vacío vale {} en la prueba y es error en el reintento", () => {
    expect(leerJsonObjeto("  ")).toEqual({ ok: true, value: {} });
    expect(leerJsonObjeto("", { obligatorio: true }).ok).toBe(false);
    expect(leerJsonObjeto("{}", { obligatorio: true }).ok).toBe(false);
  });

  it("rechaza lo que no es JSON y lo que no es un objeto", () => {
    expect(leerJsonObjeto("{documentNumber: 1}").ok).toBe(false);
    expect(leerJsonObjeto("[1, 2]").ok).toBe(false);
    expect(leerJsonObjeto('"texto"').ok).toBe(false);
    expect(leerJsonObjeto("null").ok).toBe(false);
  });

  it("devuelve el objeto leído", () => {
    expect(
      leerJsonObjeto('{"documentNumber": "123"}', { obligatorio: true }),
    ).toEqual({ ok: true, value: { documentNumber: "123" } });
  });
});

describe("tipo de consulta del probador", () => {
  const politicas = [
    { queryType: "CREDIT_SCORE", active: false },
    { queryType: "CREDIT_REPORT", active: true },
  ];

  it("usa la primera política activa y, sin políticas, el tipo por defecto", () => {
    expect(tipoDeConsultaDePrueba(politicas)).toBe("CREDIT_REPORT");
    expect(
      tipoDeConsultaDePrueba([{ queryType: "CREDIT_SCORE", active: false }]),
    ).toBe("CREDIT_SCORE");
    expect(tipoDeConsultaDePrueba(undefined)).toBe("IDENTITY_VERIFICATION");
  });

  it("ofrece los tipos de las políticas, sin repetir, e incluye el elegido", () => {
    const opciones = opcionesDeTipoDeConsulta(
      [...politicas, { queryType: "CREDIT_REPORT", active: false }],
      "CREDIT_REPORT",
    );
    expect(opciones.map((o) => o.value)).toEqual([
      "CREDIT_SCORE",
      "CREDIT_REPORT",
    ]);
    expect(opciones.every((o) => o.description.length > 0)).toBe(true);
    expect(
      opcionesDeTipoDeConsulta([], "IDENTITY_VERIFICATION").map((o) => o.value),
    ).toEqual(["IDENTITY_VERIFICATION"]);
  });
});

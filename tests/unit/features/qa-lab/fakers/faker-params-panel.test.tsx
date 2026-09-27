import { elegirOpcion } from "../../../shared/option-select-helpers";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FakerParamsPanel } from "@/features/qa-lab/fakers/faker-params-panel";
import { FakerError } from "@/features/qa-lab/fakers/faker-client";
import type { FakerCatalog } from "@/features/qa-lab/fakers/faker-types";
import type { QaTestData } from "@/features/qa-lab/fakers/use-fakers";

vi.setConfig({ testTimeout: 30000 });

/** Catálogo con la forma que publica el mock; los parámetros NO se escriben en el panel. */
const catalogo: FakerCatalog = {
  referenceDate: "2026-09-26",
  limits: { maxCount: 500, maxSeedLength: 80 },
  variants: [{ value: "valido", label: "Válido" }],
  types: [
    {
      type: "caso",
      label: "Caso completo",
      fields: [],
      params: [
        {
          name: "edadMin",
          label: "Edad mínima",
          kind: "int",
          default: 18,
          min: 18,
          max: 90,
        },
        {
          name: "departamento",
          label: "Departamento",
          kind: "enum",
          default: "cualquiera",
          options: [
            { value: "cualquiera", label: "Cualquiera" },
            { value: "LP", label: "La Paz" },
          ],
          help: "Dónde vive la persona.",
        },
        { name: "nacidoDesde", label: "Nacido desde", kind: "date" },
      ],
    },
    {
      type: "monto",
      label: "Monto",
      fields: [],
      params: [{ name: "moneda", label: "Moneda", kind: "string" }],
    },
    // Un tipo que el Lab no ajusta: no debe aparecer.
    { type: "empresa", label: "Empresa", fields: [], params: [] },
  ],
};

function datos(overrides: Partial<QaTestData> = {}): QaTestData {
  return {
    seed: "qa-base",
    rawSeed: "qa-base",
    setSeed: vi.fn(),
    params: {},
    setParam: vi.fn(),
    resetParams: vi.fn(),
    catalog: { data: catalogo, isLoading: false, error: null },
    baseCase: { data: [], error: null, isLoading: false },
    fetchCases: vi.fn(),
    ...overrides,
  } as unknown as QaTestData;
}

async function abrir() {
  await userEvent.click(
    screen.getByRole("button", { name: /Ajustar los datos generados/ }),
  );
}

describe("FakerParamsPanel · parámetros desde el catálogo del mock", () => {
  it("cerrado no pinta nada; abierto pinta sólo los tipos ajustables", async () => {
    render(<FakerParamsPanel data={datos()} />);
    expect(screen.queryByText("Caso completo")).not.toBeInTheDocument();

    await abrir();
    expect(screen.getByText("Caso completo")).toBeInTheDocument();
    expect(screen.getByText("Monto")).toBeInTheDocument();
    expect(screen.queryByText("Empresa")).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /Edad mínima/ })).toHaveValue(
      18,
    );
  });

  it("mientras carga el catálogo lo dice", async () => {
    render(
      <FakerParamsPanel
        data={datos({
          catalog: {
            data: undefined,
            isLoading: true,
            error: null,
          } as unknown as QaTestData["catalog"],
        })}
      />,
    );
    await abrir();
    expect(screen.getByText("Cargando parámetros…")).toBeInTheDocument();
  });

  it("un número se manda como número; el valor por defecto o vacío se quita", async () => {
    const setParam = vi.fn();
    render(<FakerParamsPanel data={datos({ setParam })} />);
    await abrir();
    const edad = screen.getByRole("spinbutton", { name: /Edad mínima/ });

    fireEvent.change(edad, { target: { value: "40" } });
    expect(setParam).toHaveBeenLastCalledWith("caso", "edadMin", 40);
    fireEvent.change(edad, { target: { value: "" } });
    expect(setParam).toHaveBeenLastCalledWith("caso", "edadMin", undefined);
    fireEvent.change(edad, { target: { value: "18" } });
    expect(setParam).toHaveBeenLastCalledWith("caso", "edadMin", undefined);
  });

  it("texto y fecha se mandan como texto", async () => {
    const setParam = vi.fn();
    render(<FakerParamsPanel data={datos({ setParam })} />);
    await abrir();

    fireEvent.change(screen.getByLabelText(/Moneda/), {
      target: { value: "USD" },
    });
    expect(setParam).toHaveBeenLastCalledWith("monto", "moneda", "USD");
    fireEvent.change(screen.getByLabelText(/Nacido desde/), {
      target: { value: "1990-01-01" },
    });
    expect(setParam).toHaveBeenLastCalledWith(
      "caso",
      "nacidoDesde",
      "1990-01-01",
    );
  });

  it("una lista elige su opción, y volver a la de por defecto la quita", async () => {
    const setParam = vi.fn();
    const { rerender } = render(
      <FakerParamsPanel data={datos({ setParam })} />,
    );
    await abrir();

    await elegirOpcion(
      screen.getByRole("combobox", { name: /Departamento/ }),
      "LP",
    );
    expect(setParam).toHaveBeenLastCalledWith("caso", "departamento", "LP");

    rerender(
      <FakerParamsPanel
        data={datos({ setParam, params: { caso: { departamento: "LP" } } })}
      />,
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /Departamento/ }),
      "cualquiera",
    );
    expect(setParam).toHaveBeenLastCalledWith(
      "caso",
      "departamento",
      undefined,
    );
  });

  it("con cambios lo marca y ofrece volver a los valores por defecto", async () => {
    const resetParams = vi.fn();
    render(
      <FakerParamsPanel
        data={datos({ params: { caso: { edadMin: 40 } }, resetParams })}
      />,
    );
    expect(screen.getByText("(con cambios)")).toBeInTheDocument();
    await abrir();
    expect(screen.getByRole("spinbutton", { name: /Edad mínima/ })).toHaveValue(
      40,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Volver a los valores por defecto/ }),
    );
    expect(resetParams).toHaveBeenCalledTimes(1);
  });

  it("los parámetros que rechaza el mock se listan con su motivo", async () => {
    const error = new FakerError({
      code: "QA_FAKERS_INVALID_PARAMS",
      status: 400,
      message: "Parámetros inválidos.",
      details: [{ param: "edadMin", detail: "La edad mínima es 18." }],
    });
    render(
      <FakerParamsPanel
        data={datos({
          baseCase: {
            data: undefined,
            error,
            isLoading: false,
          } as unknown as QaTestData["baseCase"],
        })}
      />,
    );
    await abrir();
    expect(screen.getByText("La edad mínima es 18.")).toBeInTheDocument();
  });
});

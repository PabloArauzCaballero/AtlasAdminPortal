import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable } from "@/shared/components/data-table/data-table";
import { PhonePreview } from "@/features/app-content/phone-preview";

const columnas = [{ header: "Texto", accessorKey: "texto" }];

describe("la tabla se ajusta cuando se pide", () => {
  it("por defecto no se encoge (las columnas de ids y cifras no deben partirse)", () => {
    render(<DataTable data={[{ texto: "uno" }]} columns={columnas} />);
    expect(screen.getByRole("table").className).toContain("min-w-max");
  });

  it("con `fit` se ajusta al ancho y parte el texto en lugar de desbordar", () => {
    render(<DataTable data={[{ texto: "uno" }]} columns={columnas} fit />);
    const tabla = screen.getByRole("table");
    expect(tabla.className).not.toContain("min-w-max");
    expect(tabla.className).toContain("break-words");
  });
});

describe("el celular no enseña barras de desplazamiento", () => {
  it("el lienzo escalado las oculta: la vertical lo ensanchaba y asomaba una barra horizontal", () => {
    render(
      <PhonePreview
        surface="faq"
        surfaceLabel="Preguntas"
        draft={null}
        published={[]}
      />,
    );
    const lienzo = screen
      .getByTestId("app-content-phone")
      .querySelector(".origin-top-left");
    expect(lienzo?.className).toContain("overflow-x-hidden");
    expect(lienzo?.className).toContain("scrollbar-width:none");
  });
});

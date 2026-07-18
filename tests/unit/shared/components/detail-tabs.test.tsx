import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";

const tabs = ["Resumen", "Columnas", "Linaje"];

describe("DetailTabs", () => {
  it("pinta una pestaña por entrada", () => {
    render(<DetailTabs tabs={tabs} active="Resumen" onChange={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("avisa qué pestaña se eligió", async () => {
    const onChange = vi.fn();
    render(<DetailTabs tabs={tabs} active="Resumen" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Linaje" }));

    expect(onChange).toHaveBeenCalledWith("Linaje");
  });

  it("pulsar la pestaña activa también avisa (es un componente controlado)", async () => {
    const onChange = vi.fn();
    render(<DetailTabs tabs={tabs} active="Resumen" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Resumen" }));

    expect(onChange).toHaveBeenCalledWith("Resumen");
  });

  it("la pestaña activa se distingue de las demás", () => {
    // Sin señal visual, el usuario no sabe dónde está.
    render(<DetailTabs tabs={tabs} active="Columnas" onChange={vi.fn()} />);
    const activa = screen.getByRole("button", { name: "Columnas" });
    const otra = screen.getByRole("button", { name: "Resumen" });

    expect(activa.className).not.toBe(otra.className);
  });

  it("un 'active' que no está en la lista no marca ninguna pestaña", () => {
    render(<DetailTabs tabs={tabs} active="Inexistente" onChange={vi.fn()} />);
    const clases = screen.getAllByRole("button").map((tab) => tab.className);

    expect(new Set(clases).size).toBe(1);
  });

  it("sin pestañas no revienta", () => {
    render(<DetailTabs tabs={[]} active="" onChange={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

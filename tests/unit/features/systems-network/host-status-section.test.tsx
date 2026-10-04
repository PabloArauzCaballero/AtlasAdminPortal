import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HostStatusReport } from "@/features/systems/types";

const { useHostStatus } = vi.hoisted(() => ({ useHostStatus: vi.fn() }));
vi.mock("@/features/systems/hooks", () => ({ useHostStatus }));

import { HostStatusSection } from "@/features/systems-network/host-status-section";

type Available = Extract<HostStatusReport, { available: true }>;

function reporte(over: Partial<Available> = {}): Available {
  return {
    available: true,
    ageMinutes: 2,
    snapshot: {
      capturedAt: "2026-10-03T14:00:00.000Z",
      ramAvailableMb: 8192,
      ramTotalMb: 24576,
      swapFreeMb: 70,
      swapTotalMb: 4095,
      load1: 12.4,
      load15: 14.2,
      cores: 8,
      diskPct: 59,
      buildCacheGb: 110,
      backupAgeHours: 3,
      apps: [
        {
          name: "erp-backend",
          principal: "healthy",
          respaldo: "healthy",
          memoryPct: 41.2,
        },
        {
          name: "pdf-worker",
          principal: "healthy",
          respaldo: null,
          memoryPct: null,
        },
      ],
    },
    status: {
      ram: "ok",
      disk: "ok",
      load: "ok",
      backup: "ok",
      stale: false,
      overall: "ok",
    },
    ...over,
  };
}

function datos(
  data: HostStatusReport | undefined,
  extra: Record<string, unknown> = {},
) {
  useHostStatus.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...extra,
  });
}

describe("HostStatusSection", () => {
  beforeEach(() => useHostStatus.mockReset());

  it("sin instantánea avisa que el informador no ha mandado nada", () => {
    datos({ available: false });
    render(<HostStatusSection />);
    expect(screen.getByRole("status").textContent).toMatch(
      /Sin lectura del servidor/,
    );
    expect(screen.queryByText("RAM disponible")).toBeNull();
  });

  it("con datos frescos enseña las cinco cifras y las apps", () => {
    datos(reporte());
    render(<HostStatusSection />);

    expect(screen.getByText("RAM disponible")).toBeTruthy();
    expect(screen.getByText("8.0 GB")).toBeTruthy();
    expect(screen.getByText("59%")).toBeTruthy();
    expect(screen.getByText("14.2")).toBeTruthy();
    expect(screen.getByText("110 GB")).toBeTruthy();
    expect(screen.getByText("hace 3 h")).toBeTruthy();
    expect(screen.queryByText(/informador esté parado/)).toBeNull();

    const tabla = screen.getByRole("table");
    const filaErp = within(tabla).getByRole("row", { name: /erp-backend/ });
    expect(within(filaErp).getAllByText("Sana")).toHaveLength(2);
    expect(within(filaErp).getByText("41 %")).toBeTruthy();
    const filaPdf = within(tabla).getByRole("row", { name: /pdf-worker/ });
    expect(within(filaPdf).getByText("Sin respaldo")).toBeTruthy();
  });

  it("una instantánea vieja lo dice con todas las letras", () => {
    datos(
      reporte({
        ageMinutes: 14,
        status: {
          ram: "ok",
          disk: "ok",
          load: "ok",
          backup: "ok",
          stale: true,
          overall: "warn",
        },
      }),
    );
    render(<HostStatusSection />);
    expect(screen.getByText(/más de 10 minutos sin datos nuevos/)).toBeTruthy();
  });

  it("una app caída o sin sonda se ve distinta de una sana", () => {
    const base = reporte();
    datos({
      ...base,
      snapshot: {
        ...base.snapshot,
        apps: [
          {
            name: "api-a",
            principal: "ausente",
            respaldo: "healthy",
            memoryPct: null,
          },
          {
            name: "api-b",
            principal: "unhealthy",
            respaldo: "starting",
            memoryPct: 95,
          },
          {
            name: "api-c",
            principal: "none",
            respaldo: "valor-raro",
            memoryPct: 10,
          },
        ],
      },
    });
    render(<HostStatusSection />);

    expect(screen.getByText("Caída")).toBeTruthy();
    expect(screen.getByText("No sana")).toBeTruthy();
    expect(screen.getByText("Arrancando")).toBeTruthy();
    expect(screen.getByText("Sin sonda")).toBeTruthy();
    // Un estado que el portal no conoce se enseña tal cual, nunca como «sana».
    expect(screen.getByText("valor-raro")).toBeTruthy();
  });

  it("si la consulta falla enseña el error y deja reintentar", () => {
    datos(undefined, { error: new Error("x") });
    render(<HostStatusSection />);
    expect(
      screen.getByText(/No se pudo cargar el estado del servidor/),
    ).toBeTruthy();
  });
});

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LatencyDemoChart } from "@/features/qa-tutorials/latency-demo-chart";

describe("LatencyDemoChart", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("arranca con una petición y un gráfico accesible", () => {
    render(<LatencyDemoChart />);
    expect(screen.getByText(/1\/30 peticiones procesadas/)).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("aria-label");
  });

  it("revela más peticiones a medida que pasa el tiempo", () => {
    render(<LatencyDemoChart />);
    act(() => {
      vi.advanceTimersByTime(140 * 4);
    });
    expect(screen.getByText(/5\/30 peticiones procesadas/)).toBeInTheDocument();
  });

  it("muestra el estado del p95 (OK o supera umbral)", () => {
    render(<LatencyDemoChart />);
    // Avanza hasta pasar el primer pico (>800ms) para que el p95 lo supere.
    act(() => {
      vi.advanceTimersByTime(140 * 20);
    });
    expect(screen.getByText(/p95 \d+ ms/)).toBeInTheDocument();
  });
});

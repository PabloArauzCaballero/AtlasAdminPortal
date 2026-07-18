import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StressLatencyChart } from "@/features/qa-lab/latency-chart";
import type { StressLatencyPoint } from "@/features/qa-lab/types";

function point(
  overrides: Partial<StressLatencyPoint> = {},
): StressLatencyPoint {
  return {
    second: 0,
    count: 10,
    errorCount: 0,
    avgLatencyMs: 40,
    p50LatencyMs: 38,
    p95LatencyMs: 90,
    maxLatencyMs: 120,
    ...overrides,
  };
}

/**
 * El SVG no expone roles: las coordenadas y los rects de hover solo se pueden
 * alcanzar por el DOM. Se centraliza aquí para que las aserciones hablen de
 * "coordenadas" y no de selectores.
 */
function pathCommands(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("path")).map(
    (element) => element.getAttribute("d") ?? "",
  );
}

function hoverTargets(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('rect[fill="transparent"]'));
}

describe("StressLatencyChart · sin muestras", () => {
  it("sin puntos no revienta y dice que no hay datos", () => {
    render(<StressLatencyChart points={[]} />);

    expect(screen.getByText("Sin datos todavía.")).toBeInTheDocument();
  });

  it("sin la prop points tampoco revienta", () => {
    // El resultado de un dry-run puede no traer `latencyTimeline`.
    render(<StressLatencyChart />);

    expect(screen.getByText("Sin datos todavía.")).toBeInTheDocument();
  });

  it("puntos con count 0 cuentan como sin datos (no dibuja un eje vacío)", () => {
    // Un segundo sin requests terminadas tiene latencias 0: pintarlo haría
    // creer que la latencia se desplomó a cero, cuando no se midió nada.
    const { container } = render(
      <StressLatencyChart points={[point({ count: 0, p95LatencyMs: 0 })]} />,
    );

    expect(screen.getByText("Sin datos todavía.")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("StressLatencyChart · muestras degeneradas", () => {
  it("una sola muestra dibuja un punto visible en vez de una línea invisible", () => {
    // Con un único punto el `path` es solo un "M": no pinta trazo. El círculo
    // es lo único que hace visible la corrida de un segundo.
    const { container } = render(
      <StressLatencyChart points={[point({ second: 0 })]} />,
    );

    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });

  it("una sola muestra no genera coordenadas NaN (división por maxSecond 0)", () => {
    // El clásico: con un único punto en el segundo 0, maxSecond sale 0 y
    // `second / maxSecond` da NaN, que deja el SVG entero en blanco.
    const { container } = render(
      <StressLatencyChart points={[point({ second: 0 })]} />,
    );

    for (const command of pathCommands(container)) {
      expect(command).not.toMatch(/NaN|Infinity/);
    }
    const circle = container.querySelector("circle");
    expect(circle?.getAttribute("cx")).not.toMatch(/NaN/);
    expect(circle?.getAttribute("cy")).not.toMatch(/NaN/);
  });

  it("latencias todas en 0 no producen NaN (división por maxLatency 0)", () => {
    const { container } = render(
      <StressLatencyChart
        points={[
          point({ second: 0, p95LatencyMs: 0, avgLatencyMs: 0 }),
          point({ second: 1, p95LatencyMs: 0, avgLatencyMs: 0 }),
        ]}
      />,
    );

    for (const command of pathCommands(container)) {
      expect(command).not.toMatch(/NaN/);
    }
  });
});

describe("StressLatencyChart · trazado", () => {
  it("dibuja un punto por segundo medido y dos series (p95 y promedio)", () => {
    const { container } = render(
      <StressLatencyChart
        points={[
          point({ second: 0 }),
          point({ second: 1 }),
          point({ second: 2 }),
        ]}
      />,
    );

    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(pathCommands(container)).toHaveLength(2);
  });

  it("una latencia mayor queda más arriba que una menor (el eje Y no está invertido)", () => {
    const { container } = render(
      <StressLatencyChart
        points={[
          point({ second: 0, p95LatencyMs: 10 }),
          point({ second: 1, p95LatencyMs: 500 }),
        ]}
      />,
    );

    const [lento, rapido] = Array.from(container.querySelectorAll("circle"));
    const yBaja = Number(lento.getAttribute("cy"));
    const yAlta = Number(rapido.getAttribute("cy"));

    // En SVG, "más arriba" es menor `y`.
    expect(yAlta).toBeLessThan(yBaja);
  });

  it("el eje rotula el máximo de latencia y el último segundo medidos", () => {
    render(
      <StressLatencyChart
        points={[
          point({ second: 0, p95LatencyMs: 90 }),
          point({ second: 7, p95LatencyMs: 350 }),
        ]}
      />,
    );

    expect(screen.getByText("350 ms")).toBeInTheDocument();
    expect(screen.getByText("7s")).toBeInTheDocument();
  });

  it("un segundo con errores se marca distinto de uno sano", () => {
    // Es la única señal visual de que hubo fallos en ese tramo.
    const { container } = render(
      <StressLatencyChart
        points={[
          point({ second: 0, errorCount: 0 }),
          point({ second: 1, errorCount: 3 }),
        ]}
      />,
    );

    const [sano, conErrores] = Array.from(container.querySelectorAll("circle"));
    expect(sano.getAttribute("class")).not.toBe(
      conErrores.getAttribute("class"),
    );
  });
});

describe("StressLatencyChart · lectura de un segundo", () => {
  it("sin hover muestra la leyenda que explica cada serie", () => {
    render(<StressLatencyChart points={[point({ second: 0 })]} />);

    expect(screen.getByText("línea sólida: p95")).toBeInTheDocument();
  });

  it("al posarse sobre un segundo muestra sus hits y su p95", () => {
    const { container } = render(
      <StressLatencyChart
        points={[point({ second: 3, count: 42, p95LatencyMs: 210 })]}
      />,
    );

    fireEvent.mouseEnter(hoverTargets(container)[0]);

    expect(screen.getByText("seg. 3")).toBeInTheDocument();
    expect(screen.getByText(/42 hits/)).toBeInTheDocument();
    expect(screen.getByText(/p95 210 ms/)).toBeInTheDocument();
  });

  it("el detalle de un segundo con errores los reporta; uno sano no los inventa", () => {
    const { container, unmount } = render(
      <StressLatencyChart points={[point({ second: 0, errorCount: 5 })]} />,
    );
    fireEvent.mouseEnter(hoverTargets(container)[0]);
    expect(screen.getByText(/5 errores/)).toBeInTheDocument();
    unmount();

    const sano = render(
      <StressLatencyChart points={[point({ second: 0, errorCount: 0 })]} />,
    );
    fireEvent.mouseEnter(hoverTargets(sano.container)[0]);
    expect(screen.queryByText(/errores/)).toBeNull();
  });

  it("al salir del segundo vuelve la leyenda", () => {
    const { container } = render(
      <StressLatencyChart points={[point({ second: 3 })]} />,
    );
    const target = hoverTargets(container)[0];

    fireEvent.mouseEnter(target);
    fireEvent.mouseLeave(target);

    expect(screen.queryByText("seg. 3")).toBeNull();
    expect(screen.getByText("línea sólida: p95")).toBeInTheDocument();
  });
});

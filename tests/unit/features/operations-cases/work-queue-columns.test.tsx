import { render, screen } from "@testing-library/react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import { buildWorkQueueColumns } from "@/features/operations-cases/work-queue-columns";
import type { WorkQueueItem } from "@/features/operations-cases/types";

/**
 * Un caso no puede tener dos bandejas.
 *
 * Cuando el Motor resolvió la evaluación, él abrió su propio caso con el expediente y la petición
 * de información; esta fila es sólo el ancla del flujo de alta y el backend rechaza cerrarla desde
 * aquí. Ofrecer «Decidir» ponía a dos personas a resolver el mismo caso sin verse, y el botón
 * llevaba a un error. Lo que se fija es que el caso delegado no ofrezca decisión y sí ofrezca el
 * camino, y que el caso resuelto localmente siga decidiéndose aquí — porque cuando el Motor no
 * decidió no hay ninguna otra bandeja.
 */
function item(overrides: Partial<WorkQueueItem> = {}): WorkQueueItem {
  return {
    workItemType: "manual_review",
    caseId: "10",
    caseCode: "MR-1",
    customerId: "900",
    priority: "high",
    status: "open",
    reasonCode: "risk_assessment_review",
    decisionExecutionId: null,
    openedAt: "2026-09-01T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function Tabla({ filas }: Readonly<{ filas: WorkQueueItem[] }>) {
  const table = useReactTable({
    data: filas,
    columns: buildWorkQueueColumns(vi.fn()),
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <table>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

describe("buildWorkQueueColumns · dónde se decide", () => {
  it("un caso delegado al Motor no ofrece decidir aquí", () => {
    render(<Tabla filas={[item({ decisionExecutionId: "exec-91" })]} />);

    expect(
      screen.queryByRole("button", { name: "Decidir" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Motor/)).toBeInTheDocument();
  });

  it("un caso que resolvió la política local sí se decide aquí", () => {
    render(<Tabla filas={[item({ decisionExecutionId: null })]} />);

    expect(screen.getByRole("button", { name: "Decidir" })).toBeEnabled();
  });

  it("un caso cerrado deja el botón inhabilitado, no lo esconde", () => {
    render(<Tabla filas={[item({ status: "closed" })]} />);

    expect(screen.getByRole("button", { name: "Decidir" })).toBeDisabled();
  });
});

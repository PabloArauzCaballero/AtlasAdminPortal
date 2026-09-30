import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReadinessChecklist } from "@/features/release-readiness/readiness-checklist";
import { ReadinessSignalsTable } from "@/features/reports-readiness/readiness-signals-table";
import { ReportWidgetsCard } from "@/features/reports/report-widgets-card";
import { ToolsHealthTable } from "@/features/systems/tools-health-table";
import { ConsumerEndpointsTable } from "@/features/decision-artifacts/consumer-endpoints-table";
import { DecisionsTable } from "@/features/decision-artifacts/decisions-table";
import { ContractTable } from "@/features/systems-endpoints/detail/contract-table";
import { ConsistencyFindingsTable } from "@/features/workflows/consistency-findings-table";
import { DomainEventsTable } from "@/features/flows/async/domain-events-table";
import type { ToolHealth } from "@/features/systems/types";
import {
  buscar,
  cabeceras,
  esperarFilas,
  esTablaHomogenea,
  filasDeDatos,
  filtrarPor,
} from "../../shared/tabla-helpers";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Checklist de release", () => {
  const items = [
    {
      key: "a",
      label: "Catálogo al día",
      status: "OK" as const,
      detail: "Sin deuda",
    },
    {
      key: "b",
      label: "QA con suites",
      status: "BLOCKED" as const,
      detail: "Falta cobertura",
    },
    {
      key: "c",
      label: "Gobierno",
      status: "NEEDS_REVIEW" as const,
      detail: "Políticas por revisar",
    },
  ];

  it("es una tabla con buscador y filtro de estado que recortan", async () => {
    render(<ReadinessChecklist items={items} />);
    esTablaHomogenea(
      ["Comprobación", "Detalle", "Estado"],
      /Buscar por comprobación o detalle/,
    );
    expect(filasDeDatos()).toHaveLength(3);
    await filtrarPor(/^Estado/, "BLOCKED");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("QA con suites");
    await buscar(/Buscar por comprobación o detalle/, "zzz");
    expect(
      await screen.findByText("Ninguna comprobación coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("sin comprobaciones dice que el release no declara ninguna", () => {
    render(<ReadinessChecklist items={[]} />);
    expect(
      screen.getByText("El release no declara comprobaciones."),
    ).toBeInTheDocument();
  });
});

describe("Señales de reportería", () => {
  it("clasifica por cobertura: 80 % listo, 50 % por revisar, menos incompleto", async () => {
    render(
      <ReadinessSignalsTable
        signals={[
          { label: "Tablas con propósito", coverage: 90 },
          { label: "Endpoints con propósito", coverage: 60 },
          { label: "Endpoints testables", coverage: 10 },
        ]}
      />,
    );
    expect(cabeceras()).toEqual(["Señal", "Cobertura", "Estado"]);
    await filtrarPor(/^Estado/, "INCOMPLETE");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("Endpoints testables");
  });
});

describe("Apartados del informe", () => {
  const widgets = [
    {
      widgetId: "w1",
      reportId: "r",
      widgetType: "kpi",
      title: "Mora total",
      description: "Cartera vencida",
      queryKey: null,
      visualConfig: null,
      position: null,
    },
    {
      widgetId: "w2",
      reportId: "r",
      widgetType: "kpi",
      title: "Colocación",
      description: null,
      queryKey: null,
      visualConfig: null,
      position: null,
    },
  ];

  it("van en tabla y el buscador recorta por título o descripción", async () => {
    render(<ReportWidgetsCard widgets={widgets} />);
    expect(cabeceras()).toEqual(["Apartado", "Qué muestra"]);
    await buscar(/Buscar por apartado o descripción/, "vencida");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("Mora total");
  });

  it("un informe sin apartados lo dice", () => {
    render(<ReportWidgetsCard widgets={[]} />);
    expect(
      screen.getByText("Este informe no declara apartados."),
    ).toBeInTheDocument();
  });
});

describe("Salud de herramientas", () => {
  const tools: ToolHealth[] = [
    {
      code: "BURO",
      name: "Buró",
      isCritical: true,
      isHealthy: false,
      status: "ACTIVE",
      checkType: "LIVE",
      healthMessage: "timeout",
    },
    {
      code: "MAIL",
      name: "Correo",
      isCritical: false,
      isHealthy: true,
      status: "ACTIVE",
      checkType: "LIVE",
    },
    {
      code: "DEV",
      name: "Herramienta dev",
      isCritical: false,
      isHealthy: null,
      status: "ACTIVE",
      checkType: "NOT_APPLICABLE",
      missingEnvVars: ["X_KEY"],
    },
  ];

  it("completa: tabla con estado en vivo, catálogo, criticidad, chequeo y mensaje", async () => {
    render(<ToolsHealthTable tools={tools} />);
    esTablaHomogenea(
      [
        "Herramienta",
        "Estado en vivo",
        "Catálogo",
        "Crítica",
        "Chequeo",
        "Qué dice",
      ],
      /Buscar por herramienta, código o mensaje/,
    );
    expect(screen.getByText("Faltan: X_KEY")).toBeInTheDocument();
    await filtrarPor(/^Estado en vivo/, "DOWN");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("Buró");
  });

  it("compacta (Inicio): sólo herramienta y estado, con el mismo buscador y filtros", async () => {
    render(<ToolsHealthTable tools={tools} compact />);
    expect(cabeceras()).toEqual(["Herramienta", "Estado en vivo"]);
    await filtrarPor(/^Criticidad/, "yes");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("BURO");
  });
});

describe("Decisiones del motor", () => {
  const bindings = [
    {
      decisionType: "identity" as const,
      artifactCode: "ID",
      source: "binding" as const,
      title: "Identidad",
    },
    {
      decisionType: "credit" as const,
      artifactCode: "CR",
      source: "environment" as const,
      title: "Crédito",
    },
    {
      decisionType: "partner" as const,
      artifactCode: null,
      source: "unset" as const,
      title: "Comercio",
    },
  ];
  const available = [
    { code: "ID", name: null, type: null, latestVersion: null, status: null },
  ];

  it("tabla con filtros de origen y de presencia en el motor", async () => {
    render(<DecisionsTable bindings={bindings} available={available} />);
    esTablaHomogenea(
      [
        "Decisión",
        "Artefacto que la resuelve",
        "En el motor",
        "Versión",
        "Flujo de trabajo",
        "Origen",
      ],
      /Buscar por decisión, artefacto o flujo de trabajo/,
    );
    await filtrarPor(/^En el motor/, "missing");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("Crédito");
    await filtrarPor(/^En el motor/, "");
    await filtrarPor(/^Origen/, "unset");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("Comercio");
  });
});

describe("Endpoints de una decisión y contratos del endpoint", () => {
  it("los endpoints que la llaman van en tabla y se buscan", async () => {
    render(
      <ConsumerEndpointsTable
        endpoints={[
          {
            method: "POST",
            path: "/credit/decide",
            purpose: "Decide el crédito",
          },
          { method: "GET", path: "/risk/score", purpose: "Lee el riesgo" },
        ]}
      />,
    );
    expect(cabeceras()).toEqual(["Operación", "Para qué la llama"]);
    await buscar(/Buscar por método, ruta o para qué se llama/, "riesgo");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("/risk/score");
  });

  it("un contrato es una tabla de campos y uno vacío se explica", async () => {
    const { unmount } = render(
      <ContractTable
        title="Payload mínimo"
        value={{
          properties: {
            monto: { type: "number", description: "Importe" },
            plazo: { type: "integer" },
          },
        }}
      />,
    );
    expect(cabeceras()).toEqual(["Campo", "Tipo / valor", "Descripción"]);
    await buscar(/Buscar por campo, tipo o descripción/, "importe");
    await esperarFilas(1);
    unmount();
    render(<ContractTable title="Query params" value={null} />);
    expect(screen.getByText("Contrato pendiente.")).toBeInTheDocument();
  });
});

describe("Consistencia de un flujo", () => {
  it("los hallazgos van en tabla con filtro de gravedad", async () => {
    render(
      <ConsistencyFindingsTable
        findings={[
          {
            severity: "error",
            code: "ROUTE_MISSING",
            stepCode: "s1",
            message: "La ruta no existe",
          },
          {
            severity: "warning",
            code: "ROLES_DIVERGE",
            stepCode: "s2",
            message: "Roles distintos",
          },
        ]}
      />,
    );
    expect(cabeceras()).toEqual(["Gravedad", "Código", "Paso", "Qué pasa"]);
    await filtrarPor(/^Gravedad/, "error");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("ROUTE_MISSING");
  });
});

describe("Eventos de dominio", () => {
  const rows = [
    {
      eventCode: "payment.confirmed",
      aggregateTypes: ["payment"],
      events: 10,
      processed: 10,
      failed: 0,
      eventsWithMessage: 10,
      messages: 10,
      messagesSent: 9,
      registered: true,
      lastEventAt: null,
      consumer: "AVISA" as const,
    },
    {
      eventCode: "customer.lifecycle.changed",
      aggregateTypes: ["customer"],
      events: 4,
      processed: 4,
      failed: 0,
      eventsWithMessage: 0,
      messages: 0,
      messagesSent: 0,
      registered: false,
      lastEventAt: null,
      consumer: "SIN_REGISTRO" as const,
    },
  ];

  it("tabla con buscador y filtros de desenlace y registro", async () => {
    render(
      <DomainEventsTable
        domainEvents={{
          windowDays: 30,
          clampedByRetention: false,
          truncated: false,
          unregistered: [],
          registeredWithoutMessages: [],
          messagesNotSent: [],
          rows,
        }}
      />,
    );
    expect(cabeceras()[0]).toBe("Desenlace");
    await filtrarPor(/^Desenlace/, "SIN_REGISTRO");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("customer.lifecycle.changed");
    await filtrarPor(/^Desenlace/, "");
    await buscar(/Buscar por evento o agregado/, "payment");
    await esperarFilas(1);
  });
});

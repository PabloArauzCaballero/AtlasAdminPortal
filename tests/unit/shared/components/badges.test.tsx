import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BooleanBadge,
  MethodBadge,
  ModuleBadge,
  PiiBadge,
  ReviewStatusBadge,
  RiskBadge,
  SeverityBadge,
  StatusBadge,
  statusTone,
} from "@/shared/components/ui/badges";

/**
 * Tabla de estados: un semáforo que pinta gris un `BLOCKED` o un `WARNING` no
 * es un semáforo. Cada valor con carga semántica debe tener su tono.
 */
describe("statusTone · verdes", () => {
  it.each(["ACTIVE", "PASSED", "ENABLED", "OK", "READY"])(
    "%s es success",
    (value) => {
      expect(statusTone(value)).toBe("success");
    },
  );
});

describe("statusTone · rojos", () => {
  it.each(["FAILED", "DISABLED", "ERROR", "REJECTED", "BLOCKED"])(
    "%s es critical",
    (value) => {
      expect(statusTone(value)).toBe("critical");
    },
  );
});

describe("statusTone · ámbares", () => {
  it.each(["NEEDS_REVIEW", "RUNNING", "QUEUED", "WARNING", "INCOMPLETE"])(
    "%s es warning",
    (value) => {
      expect(statusTone(value)).toBe("warning");
    },
  );
});

/**
 * El tono solo existe como clase, así que se traduce de vuelta a su nombre
 * semántico: así los tests afirman "CRITICAL es rojo" y no una cadena de
 * Tailwind. Si cambia la paleta, se toca este mapa y no cada aserción.
 */
const TONE_BY_CLASS: ReadonlyArray<[string, string]> = [
  ["bg-emerald-50", "success"],
  ["bg-amber-50", "warning"],
  ["bg-red-50", "critical"],
  ["bg-blue-50", "info"],
  ["bg-indigo-50", "pii"],
  ["bg-slate-100", "muted"],
  ["bg-slate-50", "default"],
];

function toneOf(text: string): string {
  const badge = screen.getByText(text);
  const found = TONE_BY_CLASS.find(([className]) =>
    badge.classList.contains(className),
  );
  if (!found) throw new Error(`Badge "${text}" sin tono reconocible.`);
  return found[1];
}

describe("statusTone · casos que el bug pintaba gris", () => {
  it("WARNING (journey de QA con fallos) no es gris", () => {
    expect(statusTone("WARNING")).not.toBe("default");
  });

  it("BLOCKED (release bloqueado) no es gris", () => {
    expect(statusTone("BLOCKED")).not.toBe("default");
  });

  it("READY / INCOMPLETE (readiness de reportes) no son grises", () => {
    expect(statusTone("READY")).not.toBe("default");
    expect(statusTone("INCOMPLETE")).not.toBe("default");
  });
});

describe("statusTone · normalización y bordes", () => {
  it("no distingue mayúsculas", () => {
    expect(statusTone("blocked")).toBe("critical");
    expect(statusTone("ready")).toBe("success");
  });

  it("sin valor es muted", () => {
    expect(statusTone(null)).toBe("muted");
    expect(statusTone(undefined)).toBe("muted");
    expect(statusTone("")).toBe("muted");
  });

  it("un estado desconocido cae en default, no en un color inventado", () => {
    expect(statusTone("ALGO_NUEVO")).toBe("default");
  });
});

describe("StatusBadge", () => {
  it("pinta el estado con el tono de statusTone y muestra el valor crudo", () => {
    render(<StatusBadge value="BLOCKED" />);

    expect(toneOf("BLOCKED")).toBe("critical");
  });

  it("un estado desconocido no se disfraza de sano", () => {
    // El bug original: cualquier valor no listado caía en gris. Gris es
    // aceptable para lo desconocido; verde nunca.
    render(<StatusBadge value="ESTADO_NUEVO" />);

    expect(toneOf("ESTADO_NUEVO")).not.toBe("success");
  });

  it("sin valor muestra un guion en tono muted", () => {
    render(<StatusBadge value={null} />);

    expect(toneOf("—")).toBe("muted");
  });
});

describe("RiskBadge", () => {
  it.each([
    ["CRITICAL", "critical"],
    ["HIGH", "warning"],
    ["MEDIUM", "info"],
    ["LOW", "success"],
  ])("riesgo %s es %s", (value, tone) => {
    render(<RiskBadge value={value} />);

    expect(toneOf(value)).toBe(tone);
  });

  it("no distingue mayúsculas pero muestra el valor tal cual llega", () => {
    render(<RiskBadge value="critical" />);

    expect(toneOf("critical")).toBe("critical");
  });

  it("sin riesgo es muted y lo dice con palabras", () => {
    render(<RiskBadge value={null} />);

    expect(toneOf("Sin riesgo")).toBe("muted");
  });

  it.each(["RIESGO_NUEVO", "SEVERE", "HIGHH"])(
    "un riesgo desconocido (%s) nunca se pinta de verde",
    (value) => {
      // Antes la cadena terminaba en `: "success"`, así que cualquier valor que
      // el front no conociera —un typo, un valor nuevo del backend— se pintaba
      // "sano". Es la misma clase de bug que ya se corrigió en `statusTone`
      // (RESUELTO_ATLAS_F3_R10_BADGES), pero peor: allí lo desconocido salía
      // gris; acá salía verde, que es una afirmación falsa sobre el riesgo.
      render(<RiskBadge value={value} />);

      expect(toneOf(value)).not.toBe("success");
    },
  );

  it("un riesgo desconocido sale neutro, igual que en SeverityBadge", () => {
    // `default` (gris) y no ámbar: gris dice "no sé interpretarlo", que es la
    // verdad. Ámbar afirmaría un nivel de riesgo que nadie calculó. Se alinea
    // con `SeverityBadge`, de estructura idéntica.
    render(<RiskBadge value="RIESGO_NUEVO" />);

    expect(toneOf("RIESGO_NUEVO")).toBe("default");
  });
});

describe("SeverityBadge", () => {
  it.each([
    ["CRITICAL", "critical"],
    ["HIGH", "critical"],
    ["MEDIUM", "warning"],
    ["LOW", "info"],
  ])("severidad %s es %s", (value, tone) => {
    render(<SeverityBadge value={value} />);

    expect(toneOf(value)).toBe(tone);
  });

  it("HIGH es tan rojo como CRITICAL (no se degrada a ámbar)", () => {
    render(<SeverityBadge value="HIGH" />);

    expect(toneOf("HIGH")).toBe("critical");
  });

  it("sin severidad es muted", () => {
    render(<SeverityBadge value={undefined} />);

    expect(toneOf("Sin severidad")).toBe("muted");
  });

  it("una severidad desconocida cae en default", () => {
    render(<SeverityBadge value="SEV_X" />);

    expect(toneOf("SEV_X")).toBe("default");
  });
});

describe("ReviewStatusBadge", () => {
  it.each([
    ["APPROVED", "Revisado", "success"],
    ["REJECTED", "Rechazado", "critical"],
    ["NEEDS_REVIEW", "Revisión pendiente", "warning"],
    ["AUTO_DETECTED", "Detectado automáticamente", "info"],
  ])("%s se traduce a '%s' con tono %s", (value, label, tone) => {
    render(<ReviewStatusBadge value={value} />);

    expect(toneOf(label)).toBe(tone);
  });

  it("un estado sin traducción muestra el valor crudo en vez de nada", () => {
    render(<ReviewStatusBadge value="PENDING_X" />);

    expect(screen.getByText("PENDING_X")).toBeInTheDocument();
  });

  it("sin revisión es muted", () => {
    render(<ReviewStatusBadge value={null} />);

    expect(toneOf("Sin revisión")).toBe("muted");
  });
});

describe("PiiBadge", () => {
  it("con PII lo marca con su tono propio", () => {
    render(<PiiBadge value />);

    expect(toneOf("PII")).toBe("pii");
  });

  it("sin PII lo dice explícitamente (no deja el hueco vacío)", () => {
    render(<PiiBadge value={false} />);

    expect(toneOf("Sin PII")).toBe("muted");
  });

  it("un valor desconocido no se marca como PII", () => {
    // `null` es "no lo sabemos"; marcarlo como PII sería un falso positivo.
    render(<PiiBadge value={null} />);

    expect(screen.getByText("Sin PII")).toBeInTheDocument();
  });
});

describe("BooleanBadge", () => {
  it("true y false usan las etiquetas por defecto en español", () => {
    const { unmount } = render(<BooleanBadge value />);
    expect(toneOf("Sí")).toBe("warning");
    unmount();

    render(<BooleanBadge value={false} />);
    expect(toneOf("No")).toBe("muted");
  });

  it("admite etiquetas y tono a medida", () => {
    render(
      <BooleanBadge
        value
        trueLabel="Habilitado"
        falseLabel="Apagado"
        tone="success"
      />,
    );

    expect(toneOf("Habilitado")).toBe("success");
  });

  it("null y undefined son un guion, no un 'No'", () => {
    // Distinguir "sin dato" de "false" importa: un flag desconocido pintado
    // como "No" es una afirmación que nadie hizo.
    const { unmount } = render(<BooleanBadge value={null} />);
    expect(toneOf("—")).toBe("muted");
    unmount();

    render(<BooleanBadge value={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("MethodBadge", () => {
  it.each([
    ["GET", "success"],
    ["POST", "info"],
    ["DELETE", "critical"],
    ["PATCH", "warning"],
    ["PUT", "warning"],
  ])("método %s es %s", (method, tone) => {
    render(<MethodBadge method={method} />);

    expect(toneOf(method)).toBe(tone);
  });

  it("normaliza a mayúsculas", () => {
    render(<MethodBadge method="get" />);

    expect(toneOf("GET")).toBe("success");
  });

  it("sin método es un guion muted", () => {
    render(<MethodBadge method={null} />);

    expect(toneOf("—")).toBe("muted");
  });
});

describe("ModuleBadge", () => {
  it("muestra el módulo en tono info", () => {
    render(<ModuleBadge value="qa-lab" />);

    expect(toneOf("qa-lab")).toBe("info");
  });

  it("sin módulo lo dice en vez de dejar el hueco", () => {
    render(<ModuleBadge value={null} />);

    expect(toneOf("Sin módulo")).toBe("muted");
  });
});

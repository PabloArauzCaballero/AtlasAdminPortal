import { describe, expect, it } from "vitest";
import {
  ESTADOS_EN_ORDEN,
  describirEstado,
  estadoEfectivo,
  estaVigente,
} from "@/features/governance-policies/policy-lifecycle";

/**
 * El ciclo de vida de una política.
 *
 * La lista pintaba el estado como un booleano. Con eso, «todavía no se ha
 * aprobado», «se suspendió por una incidencia», «venció el mes pasado» y «se
 * archivó al reemplazarla» se ven igual — y exigen cuatro acciones distintas de
 * cuatro personas distintas.
 *
 * Lo que más se prueba aquí es la discrepancia entre lo declarado y el
 * calendario, porque es la que produce la lectura peligrosa: una política
 * vencida que se lee como vigente es alguien aplicando una regla que ya no rige.
 */

const HOY = new Date("2026-08-16T12:00:00.000Z");

describe("el calendario manda sobre «activa»", () => {
  it("una política activa cuya vigencia pasó está VENCIDA", () => {
    expect(
      estadoEfectivo(
        { status: "ACTIVE", effectiveUntil: "2026-07-31T23:59:59.000Z" },
        HOY,
      ),
    ).toBe("VENCIDA");
  });

  it("una política activa con vigencia futura todavía no rige", () => {
    // Decir «activa» haría creer que ya se aplica.
    expect(
      estadoEfectivo(
        { status: "ACTIVE", effectiveFrom: "2026-09-01T00:00:00.000Z" },
        HOY,
      ),
    ).toBe("BORRADOR");
  });

  it("una política activa dentro de su ventana sí rige", () => {
    expect(
      estadoEfectivo(
        {
          status: "ACTIVE",
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          effectiveUntil: "2026-12-31T23:59:59.000Z",
        },
        HOY,
      ),
    ).toBe("ACTIVA");
  });

  it("sin fechas, una activa es activa", () => {
    expect(estadoEfectivo({ status: "ACTIVE" }, HOY)).toBe("ACTIVA");
  });
});

describe("las decisiones humanas ganan sobre el calendario", () => {
  it("una archivada no «vence»: ya se retiró", () => {
    expect(
      estadoEfectivo(
        { status: "ARCHIVED", effectiveUntil: "2026-07-01T00:00:00.000Z" },
        HOY,
      ),
    ).toBe("ARCHIVADA");
  });

  it("una suspendida sigue suspendida aunque su ventana esté abierta", () => {
    // Suspender es una decisión explícita —casi siempre por una incidencia— y
    // dejar que el calendario la reactivara sería reabrir sola una política que
    // alguien apagó a propósito.
    expect(
      estadoEfectivo(
        { status: "SUSPENDED", effectiveUntil: "2026-12-31T00:00:00.000Z" },
        HOY,
      ),
    ).toBe("SUSPENDIDA");
  });

  it("un borrador no se activa por tener fechas puestas", () => {
    expect(
      estadoEfectivo(
        { status: "DRAFT", effectiveFrom: "2026-01-01T00:00:00.000Z" },
        HOY,
      ),
    ).toBe("BORRADOR");
  });
});

describe("el booleano heredado se traduce sin perder información", () => {
  it("active=false es ARCHIVADA, no borrador", () => {
    // Una política que existió y se apagó no vuelve a estar sin escribir.
    expect(estadoEfectivo({ active: false }, HOY)).toBe("ARCHIVADA");
  });

  it("active=true sigue sujeta al calendario", () => {
    expect(
      estadoEfectivo(
        { active: true, effectiveUntil: "2026-01-01T00:00:00.000Z" },
        HOY,
      ),
    ).toBe("VENCIDA");
  });
});

describe("las grafías del backend no dejan filas sin estado", () => {
  it.each([
    ["active", "ACTIVA"],
    ["ACTIVA", "ACTIVA"],
    ["Enabled", "ACTIVA"],
    ["paused", "SUSPENDIDA"],
    ["INACTIVE", "ARCHIVADA"],
    ["expired", "VENCIDA"],
  ])("«%s» se lee como %s", (entrada, esperado) => {
    expect(estadoEfectivo({ status: entrada }, HOY)).toBe(esperado);
  });

  it("una grafía desconocida no revienta ni deja la fila muda", () => {
    // Fallar aquí dejaría la fila sin estado, que es peor que traducir de más.
    expect(estadoEfectivo({ status: "LO_QUE_SEA" }, HOY)).toBe("ACTIVA");
  });

  it("una fecha ilegible se ignora en vez de tumbar la lectura", () => {
    expect(
      estadoEfectivo({ status: "ACTIVE", effectiveUntil: "ayer" }, HOY),
    ).toBe("ACTIVA");
  });
});

describe("cada estado se puede pintar y explicar", () => {
  it("los cinco tienen etiqueta, tono y ayuda", () => {
    expect(ESTADOS_EN_ORDEN).toHaveLength(5);
    for (const estado of ESTADOS_EN_ORDEN) {
      expect(estado.label).toBeTruthy();
      expect(estado.tone).toBeTruthy();
      // Sin la ayuda, «Suspendida» no dice qué hacer al respecto.
      expect(estado.help.length).toBeGreaterThan(20);
    }
  });

  it("sólo UNO de los cinco cuenta como vigente", () => {
    // Es lo que impide que un informe sume como aplicables las suspendidas.
    expect(
      ESTADOS_EN_ORDEN.filter((e) => e.vigente).map((e) => e.code),
    ).toEqual(["ACTIVA"]);
  });

  it("estaVigente responde la pregunta operativa directamente", () => {
    expect(estaVigente({ status: "ACTIVE" }, HOY)).toBe(true);
    expect(
      estaVigente({ status: "ACTIVE", effectiveUntil: "2026-01-01" }, HOY),
    ).toBe(false);
    expect(describirEstado("VENCIDA").vigente).toBe(false);
  });
});

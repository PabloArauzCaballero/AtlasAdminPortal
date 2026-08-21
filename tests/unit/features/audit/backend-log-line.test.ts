import { describe, expect, it } from "vitest";
import {
  countByLevel,
  logClock,
  parseBackendLogBlock,
  parseBackendLogLine,
} from "@/features/audit/backend-log-line";

const REAL_LINE = JSON.stringify({
  ts: "2026-08-20T20:05:01.313Z",
  level: "log",
  context: "ArchivoLogMongoSyncService",
  correlationId: null,
  traceId: null,
  message: "Archivo.log reiniciado: 961131 bytes ya confirmados en MongoDB.",
});

describe("parseBackendLogLine", () => {
  it("deserializa el formato real de AppFileLoggerService", () => {
    const line = parseBackendLogLine(REAL_LINE, 0);
    expect(line.level).toBe("log");
    expect(line.context).toBe("ArchivoLogMongoSyncService");
    expect(line.message).toBe(
      "Archivo.log reiniciado: 961131 bytes ya confirmados en MongoDB.",
    );
    expect(line.timestamp).toBe("2026-08-20T20:05:01.313Z");
  });

  /**
   * El nivel llega en MINÚSCULAS. La terminal anterior coloreaba buscando `/\bERROR\b/` sobre el
   * texto crudo, así que un error real del backend se pintaba con el color de una línea normal:
   * exactamente la línea que no se puede pasar por alto era la que no destacaba.
   */
  it("reconoce el nivel en minúsculas", () => {
    const line = parseBackendLogLine(
      JSON.stringify({ level: "error", message: "algo falló" }),
      0,
    );
    expect(line.level).toBe("error");
  });

  it("normaliza los niveles de otros runtimes (`info`, `warning`)", () => {
    expect(
      parseBackendLogLine(JSON.stringify({ level: "info", message: "x" }), 0)
        .level,
    ).toBe("log");
    expect(
      parseBackendLogLine(JSON.stringify({ level: "warning", message: "x" }), 0)
        .level,
    ).toBe("warn");
  });

  it("conserva el stack de un error", () => {
    const line = parseBackendLogLine(
      JSON.stringify({ level: "error", message: "boom", stack: "at foo()" }),
      0,
    );
    expect(line.stack).toBe("at foo()");
  });

  /**
   * Una línea que no pasó por el logger —salida de arranque, volcado de proceso— es justo lo que se
   * busca cuando algo se rompe al arrancar. Descartarla dejaría fuera la evidencia útil.
   */
  it("una línea que no es JSON se conserva como texto crudo", () => {
    const line = parseBackendLogLine(
      "Nest application successfully started",
      0,
    );
    expect(line.message).toBe("Nest application successfully started");
    expect(line.level).toBe("unknown");
  });

  it("deduce el nivel de una línea suelta por su texto", () => {
    expect(parseBackendLogLine("[ERROR] no se pudo conectar", 0).level).toBe(
      "error",
    );
    expect(parseBackendLogLine("WARN: reintentando", 0).level).toBe("warn");
  });

  it("un JSON que no es un log no se disfraza de entrada del backend", () => {
    const line = parseBackendLogLine('{"foo":"bar"}', 0);
    expect(line.level).toBe("unknown");
    expect(line.message).toBe('{"foo":"bar"}');
  });

  it("un JSON roto no rompe la terminal", () => {
    const line = parseBackendLogLine('{"level":"error"', 0);
    expect(line.message).toBe('{"level":"error"');
  });
});

describe("parseBackendLogBlock", () => {
  it("separa por líneas y descarta las vacías", () => {
    const lines = parseBackendLogBlock(`${REAL_LINE}\n\n${REAL_LINE}\n`);
    expect(lines).toHaveLength(2);
    expect(lines[1].index).toBe(1);
  });
});

describe("countByLevel", () => {
  it("cuenta cuántas líneas hay de cada nivel", () => {
    const counts = countByLevel(
      parseBackendLogBlock(
        [
          JSON.stringify({ level: "error", message: "a" }),
          JSON.stringify({ level: "error", message: "b" }),
          JSON.stringify({ level: "log", message: "c" }),
        ].join("\n"),
      ),
    );
    expect(counts.error).toBe(2);
    expect(counts.log).toBe(1);
    expect(counts.warn).toBe(0);
  });
});

describe("logClock", () => {
  it("muestra hora con milisegundos", () => {
    expect(logClock("2026-08-20T20:05:01.313Z")).toMatch(
      /^\d{2}:\d{2}:\d{2}\.\d{3}$/,
    );
  });

  it("sin marca de tiempo deja el hueco visible, no una hora inventada", () => {
    expect(logClock(null)).toBe("--:--:--.---");
  });

  it("una marca ilegible se muestra tal cual en vez de como `Invalid Date`", () => {
    expect(logClock("ayer por la tarde")).toBe("ayer por la tarde");
  });
});

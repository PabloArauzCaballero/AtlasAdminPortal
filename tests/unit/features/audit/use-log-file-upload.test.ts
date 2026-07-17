import { describe, expect, it, vi } from "vitest";
import {
  evaluateLogFile,
  MAX_LOG_FILE_BYTES,
  MAX_LOG_LINES,
} from "@/features/audit/use-log-file-upload";

describe("evaluateLogFile · límite de tamaño", () => {
  it("rechaza un archivo por encima del tope sin llegar a leerlo", async () => {
    const read = vi.fn(async () => "no debería leerse");

    const result = await evaluateLogFile(
      { name: "mongo.log", size: MAX_LOG_FILE_BYTES + 1 },
      read,
    );

    // Lo importante: no se llama a file.text(), que es lo que colgaba la pestaña.
    expect(read).not.toHaveBeenCalled();
    expect(result.log).toBeNull();
    expect(result.notice).toMatch(/máximo/i);
  });

  it("acepta un archivo dentro del tope", async () => {
    const result = await evaluateLogFile(
      { name: "mongo.log", size: 1_000 },
      async () => "linea 1\nlinea 2",
    );

    expect(result.log).toEqual({
      name: "mongo.log",
      content: "linea 1\nlinea 2",
    });
    expect(result.notice).toBeNull();
  });
});

describe("evaluateLogFile · límite de líneas", () => {
  it("trunca y avisa cuando hay demasiadas líneas", async () => {
    const content = Array.from(
      { length: MAX_LOG_LINES + 500 },
      (_, index) => `linea ${index}`,
    ).join("\n");

    const result = await evaluateLogFile(
      { name: "mongo.log", size: 1_000 },
      async () => content,
    );

    expect(result.log?.content.split("\n")).toHaveLength(MAX_LOG_LINES);
    expect(result.notice).toMatch(/primeras/i);
  });

  it("no trunca cuando está justo en el límite", async () => {
    const content = Array.from(
      { length: MAX_LOG_LINES },
      (_, index) => `linea ${index}`,
    ).join("\n");

    const result = await evaluateLogFile(
      { name: "mongo.log", size: 1_000 },
      async () => content,
    );

    expect(result.notice).toBeNull();
    expect(result.log?.content).toBe(content);
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QaLogDownload } from "@/features/qa-lab/qa-log-download";

vi.setConfig({ testTimeout: 30000 });

const LINES = ['{"level":30,"msg":"request"}', '{"level":40,"msg":"slow"}'];

/**
 * jsdom no implementa `URL.createObjectURL`. Se stubea capturando el Blob para
 * poder afirmar QUÉ se descargaría, no solo que se llamó.
 */
const blobs = new Map<string, Blob>();

beforeEach(() => {
  let counter = 0;
  blobs.clear();
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn((blob: Blob) => {
      const href = `blob:qa-${counter++}`;
      blobs.set(href, blob);
      return href;
    }),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function blobOf(href: string): Blob {
  const blob = blobs.get(href);
  if (!blob) throw new Error(`No se registró ningún Blob para ${href}`);
  return blob;
}

describe("QaLogDownload · sin logs", () => {
  it("sin líneas no ofrece descargar un archivo vacío", () => {
    const { container } = render(
      <QaLogDownload fileName="qa.log" lines={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe("QaLogDownload · descarga", () => {
  it("el enlace descarga con el nombre de archivo que da el runner", () => {
    render(<QaLogDownload fileName="qa-run-42.log" lines={LINES} />);

    expect(
      screen.getByRole("link", { name: "Descargar logs Pino" }),
    ).toHaveAttribute("download", "qa-run-42.log");
  });

  it("el archivo se arma en el navegador con un Blob, no abriendo una URL", async () => {
    // `window.open` está prohibido fuera de `data-exports` por
    // `check-source-boundaries.mjs`: los logs pueden traer datos de sesión y no
    // deben salir del cliente.
    render(<QaLogDownload fileName="qa.log" lines={LINES} />);
    const href = screen
      .getByRole("link", { name: "Descargar logs Pino" })
      .getAttribute("href") as string;

    expect(href).toMatch(/^blob:/);
    expect(await blobOf(href).text()).toBe(`${LINES.join("\n")}\n`);
  });

  it("el contenido es NDJSON: una entrada por línea y salto final", async () => {
    // Es lo que espera `pino`/`jq` al otro lado; sin el salto final la última
    // entrada se pierde al concatenar.
    render(<QaLogDownload fileName="qa.log" lines={LINES} />);
    const href = screen
      .getByRole("link", { name: "Descargar logs Pino" })
      .getAttribute("href") as string;
    const blob = blobOf(href);

    expect(blob.type).toBe("application/x-ndjson");
    expect((await blob.text()).split("\n").filter(Boolean)).toHaveLength(2);
    expect(await blob.text()).toMatch(/\n$/);
  });

  it("no se regenera el Blob en cada render (fuga de object URLs)", () => {
    const { rerender } = render(
      <QaLogDownload fileName="qa.log" lines={LINES} />,
    );
    rerender(<QaLogDownload fileName="qa.log" lines={LINES} />);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("unos logs nuevos generan un archivo nuevo", () => {
    const { rerender } = render(
      <QaLogDownload fileName="qa.log" lines={LINES} />,
    );
    const primero = screen
      .getByRole("link", { name: "Descargar logs Pino" })
      .getAttribute("href");

    rerender(
      <QaLogDownload fileName="qa.log" lines={['{"msg":"otra corrida"}']} />,
    );

    expect(
      screen
        .getByRole("link", { name: "Descargar logs Pino" })
        .getAttribute("href"),
    ).not.toBe(primero);
  });

  it("al descargar se libera el object URL", async () => {
    // Sin el revoke, cada corrida deja el Blob entero retenido en memoria
    // mientras la pestaña siga viva. `fireEvent` y no `userEvent`: este ancla
    // lleva `download` y jsdom se cuelga intentando navegar.
    render(<QaLogDownload fileName="qa.log" lines={LINES} />);

    fireEvent.click(screen.getByRole("link", { name: "Descargar logs Pino" }));

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1));
  });
});

describe("QaLogDownload · copiar al portapapeles", () => {
  it("copia exactamente el mismo NDJSON que se descargaría", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<QaLogDownload fileName="qa.log" lines={LINES} />);

    await userEvent.click(screen.getByRole("button", { name: /Copiar logs/ }));

    expect(writeText).toHaveBeenCalledWith(`${LINES.join("\n")}\n`);
  });

  it("confirma la copia y vuelve al estado inicial pasado el aviso", async () => {
    // Sin el acuse el operador no sabe si el clic hizo algo.
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<QaLogDownload fileName="qa.log" lines={LINES} />);

    await userEvent.click(screen.getByRole("button", { name: /Copiar logs/ }));
    expect(
      await screen.findByRole("button", { name: /Copiado/ }),
    ).toBeInTheDocument();

    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: /Copiar logs/ }),
        ).toBeInTheDocument(),
      { timeout: 4000 },
    );
  });
});

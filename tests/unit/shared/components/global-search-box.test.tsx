import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearchBox } from "@/shared/components/layout/internal-shell/global-search-box";
import { renderWithProviders } from "../../../helpers/render-with-providers";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

/**
 * Se mockea el transporte HTTP, no el hook ni el normalizador: así el test
 * recorre de verdad `globalSearch` -> `normalizeSearchPayload` ->
 * `isSafeInternalPath`. Mockear `useGlobalSearch` dejaría fuera precisamente la
 * validación de `href`, que es lo que aquí se quiere garantizar.
 */
const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ apiRequest }));

const DEBOUNCE_MS = 350;

beforeEach(() => {
  apiRequest.mockResolvedValue({ items: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

function caja() {
  // El input implementa el patrón combobox de ARIA 1.2 (role="combobox" +
  // aria-controls al listbox), así que su rol accesible es "combobox", no
  // "textbox".
  return screen.getByRole("combobox", { name: "Buscador global" });
}

/**
 * Teclear se simula con `fireEvent.change` en lugar de `user.type` a propósito:
 * el `onChange` de la caja ya abre el desplegable, y así el test controla el
 * instante exacto del cambio de valor, que es lo que arranca el debounce.
 */
function teclear(texto: string) {
  fireEvent.change(caja(), { target: { value: texto } });
}

function conResultados(items: unknown[]) {
  apiRequest.mockResolvedValue({ items });
}

/**
 * Adelanta el reloj dentro de `act`: al vencer el debounce se hace un setState
 * y react-query arranca la consulta, y sin `act` React no procesa ese trabajo.
 */
async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Escribe y espera a que el debounce dispare la consulta (timers reales). */
async function buscar(texto: string) {
  renderWithProviders(<GlobalSearchBox />);
  teclear(texto);
  await waitFor(() => expect(apiRequest).toHaveBeenCalled(), { timeout: 2000 });
}

describe("GlobalSearchBox · debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no consulta al backend mientras el usuario sigue tecleando", async () => {
    // 350 ms es la diferencia entre una petición por búsqueda y una por tecla.
    renderWithProviders(<GlobalSearchBox />);

    teclear("e");
    teclear("en");
    teclear("end");
    await avanzar(DEBOUNCE_MS - 1);

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("cada tecla reinicia la cuenta: no se acumulan peticiones", async () => {
    renderWithProviders(<GlobalSearchBox />);

    teclear("e");
    await avanzar(300);
    teclear("en");
    await avanzar(300);
    teclear("end");
    await avanzar(DEBOUNCE_MS);

    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it("consulta el texto final una sola vez cuando el usuario se detiene", async () => {
    renderWithProviders(<GlobalSearchBox />);

    teclear("endpoints");
    await avanzar(DEBOUNCE_MS);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/internal/search", {
      query: { q: "endpoints", limit: 50 },
    });
  });

  it("con la caja vacía no consulta nada", async () => {
    renderWithProviders(<GlobalSearchBox />);

    fireEvent.focus(caja());
    await avanzar(DEBOUNCE_MS * 2);

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("solo espacios tampoco dispara una consulta vacía", async () => {
    renderWithProviders(<GlobalSearchBox />);

    teclear("   ");
    await avanzar(DEBOUNCE_MS * 2);

    expect(apiRequest).not.toHaveBeenCalled();
  });
});

describe("GlobalSearchBox · destinos inseguros", () => {
  // NOTA_ATLAS_F1_R5: el `href` lo decide el backend y acaba en un <Link>. Un
  // destino no interno convierte el buscador en una redirección abierta.
  const INSEGUROS = [
    ["protocol-relative", "//evil.example"],
    ["backslash", "/\\evil.example"],
    ["javascript:", "javascript:alert(1)"],
    ["absoluto externo", "https://evil.example/robar"],
    ["con salto de linea", "/internal/audit\n"],
  ] as const;

  it.each(INSEGUROS)(
    "un href %s nunca se ofrece como sugerencia navegable",
    async (_caso, href) => {
      conResultados([{ id: "1", kind: "Endpoint", title: "Trampa", href }]);

      await buscar("trampa");

      // No basta con que no haya enlace: el resultado debe desaparecer del todo.
      expect(await screen.findByText(/Sin coincidencias/)).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /Trampa/ })).toBeNull();
      expect(screen.queryByText("Trampa")).toBeNull();
    },
  );

  it("ningún enlace del desplegable apunta fuera del portal", async () => {
    conResultados([
      { id: "1", kind: "Endpoint", title: "Trampa", href: "//evil.example" },
      { id: "2", kind: "Endpoint", title: "Bueno", href: "/internal/audit" },
    ]);

    await buscar("mix");

    await screen.findByRole("option", { name: /Bueno/ });
    for (const link of screen.getAllByRole("option")) {
      expect(link.getAttribute("href")).toMatch(/^\/(?![/\\])/);
    }
  });

  it("descartar los inseguros no borra los resultados legítimos", async () => {
    // El filtro debe quitar solo la manzana podrida, no el cesto entero.
    conResultados([
      { id: "1", kind: "Endpoint", title: "Trampa", href: "//evil.example" },
      { id: "2", kind: "Endpoint", title: "Bueno", href: "/internal/audit" },
    ]);

    await buscar("mix");

    expect(
      await screen.findByRole("option", { name: /Bueno/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Trampa/ })).toBeNull();
  });
});

describe("GlobalSearchBox · sugerencias", () => {
  it("una ruta interna sí se ofrece, y apunta a donde dijo el backend", async () => {
    conResultados([
      {
        id: "1",
        kind: "Endpoint",
        title: "Listar clientes",
        subtitle: "GET /clients",
        href: "/internal/systems/endpoints/1",
      },
    ]);

    await buscar("clientes");

    expect(
      await screen.findByRole("option", { name: /Listar clientes/ }),
    ).toHaveAttribute("href", "/internal/systems/endpoints/1");
  });

  it("no desborda el desplegable: como mucho 6 sugerencias", async () => {
    conResultados(
      Array.from({ length: 12 }, (_, index) => ({
        id: String(index),
        kind: "Endpoint",
        title: `Resultado ${index}`,
        href: `/internal/audit/${index}`,
      })),
    );

    await buscar("muchos");

    await screen.findByRole("option", { name: /Resultado 0/ });
    expect(screen.getAllByRole("option")).toHaveLength(6);
  });

  it("sin coincidencias lo dice, en vez de dejar el desplegable mudo", async () => {
    conResultados([]);

    await buscar("nada");

    expect(await screen.findByText(/Sin coincidencias/)).toBeInTheDocument();
  });

  it("abrir una sugerencia guarda el término en las recientes", async () => {
    // Ir directo a un resultado también es "haber buscado eso": si no se
    // guardara, el historial solo recogería las búsquedas que nunca aciertan.
    conResultados([
      { id: "1", kind: "Endpoint", title: "Bueno", href: "/internal/audit" },
    ]);

    await buscar("endpoints");
    fireEvent.click(await screen.findByRole("option", { name: /Bueno/ }));

    expect(
      JSON.parse(window.localStorage.getItem("atlas.recentSearches") ?? "[]"),
    ).toContain("endpoints");
  });
});

describe("GlobalSearchBox · navegación", () => {
  it("Enter lleva a la página de resultados con la query escapada", async () => {
    // Sin encodeURIComponent, un "&" partiría la query en dos parámetros.
    renderWithProviders(<GlobalSearchBox />);

    teclear("pagos & cobros");
    fireEvent.submit(caja().closest("form") as HTMLFormElement);

    expect(push).toHaveBeenCalledWith(
      "/internal/search?q=pagos%20%26%20cobros",
    );
  });

  it("Enter con la caja vacía no navega a una búsqueda sin término", async () => {
    renderWithProviders(<GlobalSearchBox />);

    teclear("   ");
    fireEvent.submit(caja().closest("form") as HTMLFormElement);

    expect(push).not.toHaveBeenCalled();
  });
});

describe("GlobalSearchBox · búsquedas recientes", () => {
  function conRecientes(items: string[]) {
    window.localStorage.setItem("atlas.recentSearches", JSON.stringify(items));
  }

  it("guarda el término buscado para la próxima vez", async () => {
    renderWithProviders(<GlobalSearchBox />);

    teclear("endpoints");
    fireEvent.submit(caja().closest("form") as HTMLFormElement);

    // El submit cierra el desplegable; el término se reofrece al volver.
    teclear("");
    fireEvent.focus(caja());

    expect(
      await screen.findByRole("option", { name: /endpoints/ }),
    ).toBeInTheDocument();
  });

  it("pulsar una búsqueda reciente vuelve a navegar a ella", async () => {
    const user = userEvent.setup();
    conRecientes(["endpoints"]);
    renderWithProviders(<GlobalSearchBox />);

    await user.click(caja());
    await user.click(await screen.findByRole("option", { name: /endpoints/ }));

    expect(push).toHaveBeenCalledWith("/internal/search?q=endpoints");
  });

  it("Escape cierra el desplegable", async () => {
    conRecientes(["endpoints"]);
    renderWithProviders(<GlobalSearchBox />);
    fireEvent.focus(caja());
    expect(
      await screen.findByRole("option", { name: /endpoints/ }),
    ).toBeInTheDocument();

    fireEvent.keyDown(caja(), { key: "Escape" });

    expect(screen.queryByRole("option", { name: /endpoints/ })).toBeNull();
  });

  it("un clic fuera cierra el desplegable", async () => {
    const user = userEvent.setup();
    conRecientes(["endpoints"]);
    renderWithProviders(
      <div>
        <GlobalSearchBox />
        <button type="button">fuera</button>
      </div>,
    );
    fireEvent.focus(caja());
    expect(
      await screen.findByRole("option", { name: /endpoints/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "fuera" }));

    expect(screen.queryByRole("option", { name: /endpoints/ })).toBeNull();
  });
});

describe("GlobalSearchBox · navegación por teclado (combobox accesible)", () => {
  function conRecientes(items: string[]) {
    window.localStorage.setItem("atlas.recentSearches", JSON.stringify(items));
  }

  it("expone el patrón combobox: aria-controls y aria-expanded", async () => {
    conRecientes(["endpoints"]);
    renderWithProviders(<GlobalSearchBox />);
    const input = caja();

    expect(input).toHaveAttribute("aria-expanded", "false");
    fireEvent.focus(input);

    await screen.findByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls");
  });

  it("las flechas mueven el resaltado y lo reflejan en aria-activedescendant", async () => {
    conRecientes(["alfa", "bravo", "charlie"]);
    renderWithProviders(<GlobalSearchBox />);
    const input = caja();
    fireEvent.focus(input);
    await screen.findByRole("listbox");

    // Sin resaltado inicial: no hay descendiente activo.
    expect(input).not.toHaveAttribute("aria-activedescendant");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("ArrowUp desde el primero envuelve al último (navegación circular)", async () => {
    conRecientes(["alfa", "bravo", "charlie"]);
    renderWithProviders(<GlobalSearchBox />);
    const input = caja();
    fireEvent.focus(input);
    await screen.findByRole("listbox");

    fireEvent.keyDown(input, { key: "ArrowUp" });

    const options = screen.getAllByRole("option");
    expect(options[options.length - 1]).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("Enter sobre una reciente resaltada navega a ella, no a la query cruda", async () => {
    conRecientes(["endpoints", "clientes"]);
    renderWithProviders(<GlobalSearchBox />);
    const input = caja();
    fireEvent.focus(input);
    await screen.findByRole("listbox");

    fireEvent.keyDown(input, { key: "ArrowDown" }); // resalta "endpoints"
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    expect(push).toHaveBeenCalledWith("/internal/search?q=endpoints");
  });

  it("las sugerencias son options con aria-selected navegable", async () => {
    conResultados([
      { id: "1", kind: "Endpoint", title: "Uno", href: "/internal/a" },
      { id: "2", kind: "Endpoint", title: "Dos", href: "/internal/b" },
    ]);
    await buscar("mix");
    const input = caja();
    await screen.findByRole("listbox");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });

    // Enter sobre la 2ª sugerencia abre su href, no la página de query.
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(push).toHaveBeenCalledWith("/internal/b");
  });
});

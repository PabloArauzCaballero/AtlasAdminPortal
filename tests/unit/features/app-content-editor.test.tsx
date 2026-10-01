import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EntryEditor } from "@/features/app-content/entry-editor";
import {
  PhonePreview,
  type PreviewDraft,
} from "@/features/app-content/phone-preview";
import type { AppContentEntry } from "@/features/app-content/types";
import { renderWithProviders } from "../../helpers/render-with-providers";
import { elegirOpcion } from "../shared/option-select-helpers";

const save = vi.fn();
vi.mock("@/features/app-content/hooks", () => ({
  useSaveAppContent: () => ({ mutate: save, isPending: false, error: null }),
}));

const entry = (extra: Partial<AppContentEntry> = {}): AppContentEntry => ({
  contentId: "1",
  surface: "faq",
  contentKey: "faq.uno",
  locale: "es-BO",
  title: "Pregunta uno",
  subtitle: null,
  bodyMd: "Respuesta",
  bullets: [
    { text: "Primero", icon: "check" },
    { text: "Segundo", icon: "escudo" },
  ],
  metadata: {},
  actionKind: null,
  actionLabel: null,
  actionValue: null,
  resolvedAction: null,
  displayOrder: 10,
  isActive: true,
  publishedAt: null,
  updatedAt: null,
  ...extra,
});

function abrir(e = entry()) {
  const onDraftChange = vi.fn();
  renderWithProviders(
    <EntryEditor entry={e} onClose={() => {}} onDraftChange={onDraftChange} />,
  );
  return onDraftChange;
}

const textos = () =>
  [...document.querySelectorAll('[data-testid^="bullet-faq.uno-"]')].map(
    (nodo) => (nodo as HTMLTextAreaElement).value,
  );

describe("el editor de una pieza", () => {
  it("el selector DIBUJA los iconos y elegir uno lo aplica al punto", async () => {
    abrir();
    fireEvent.click(screen.getByTestId("icon-faq.uno-0-boton"));
    // Todos los iconos de la app aparecen como botones dibujados, con su nombre accesible.
    expect(
      screen.getAllByRole("button", {
        name: /^(Visto bueno|Candado|Chispa|Billetera)$/,
      }),
    ).toHaveLength(4);
    fireEvent.click(screen.getByTestId("icon-faq.uno-0-icono-candado"));
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls.at(-1)?.[0].bullets[0]).toMatchObject({
      text: "Primero",
      icon: "candado",
      iconImage: null,
    });
  });

  it("los puntos se pueden reordenar y quitar", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Bajar el punto 1" }));
    expect(textos()).toEqual(["Segundo", "Primero"]);
    fireEvent.click(screen.getByRole("button", { name: "Quitar el punto 1" }));
    expect(textos()).toEqual(["Primero"]);
  });

  it("«Destacar» es un interruptor del punto", () => {
    abrir();
    const boton = screen.getAllByRole("button", { name: "Destacar" })[0];
    expect(boton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(boton);
    expect(
      screen.getAllByRole("button", { name: "Destacar" })[0],
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("el orden se cambia con el campo y con los botones, y se guarda", async () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: /Bajar la pieza/ }));
    expect(screen.getByTestId("order-faq.uno")).toHaveValue(20);
    fireEvent.change(screen.getByTestId("order-faq.uno"), {
      target: { value: "35" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() =>
      expect(save.mock.calls.at(-1)?.[0].displayOrder).toBe(35),
    );
  });

  it("una pieza sin botón puede ganar uno: elegir el tipo hace aparecer texto y destino", async () => {
    abrir();
    expect(screen.queryByTestId("action-label-faq.uno")).toBeNull();
    await elegirOpcion(screen.getByTestId("action-kind-faq.uno"), "whatsapp");
    fireEvent.change(await screen.findByTestId("action-label-faq.uno"), {
      target: { value: "Escríbenos" },
    });
    fireEvent.change(screen.getByTestId("action-value-faq.uno"), {
      target: { value: "77377232" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() =>
      expect(save.mock.calls.at(-1)?.[0]).toMatchObject({
        actionKind: "whatsapp",
        actionLabel: "Escríbenos",
        actionValue: "77377232",
      }),
    );
  });

  it("quitar el botón (Sin botón) guarda la pieza sin acción", async () => {
    abrir(
      entry({
        actionKind: "link",
        actionLabel: "Ver",
        actionValue: "https://a.bo",
      }),
    );
    await elegirOpcion(screen.getByTestId("action-kind-faq.uno"), "");
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() =>
      expect(save.mock.calls.at(-1)?.[0]).toMatchObject({
        actionKind: null,
        actionLabel: null,
        actionValue: null,
      }),
    );
  });

  it("una pieza con botón enseña su texto y destino, y se guardan", async () => {
    abrir(
      entry({
        actionKind: "whatsapp",
        actionLabel: "Escribir",
        actionValue: "77377232",
      }),
    );
    fireEvent.change(screen.getByTestId("action-value-faq.uno"), {
      target: { value: "70000000" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls.at(-1)?.[0]).toMatchObject({
      actionKind: "whatsapp",
      actionLabel: "Escribir",
      actionValue: "70000000",
    });
  });

  it("avisa de los cambios sin guardar", () => {
    abrir();
    expect(screen.getByText("Sin cambios")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("title-faq.uno"), {
      target: { value: "Otro título" },
    });
    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
  });
});

const pieza = (extra: Partial<PreviewDraft>): PreviewDraft => ({
  title: "",
  subtitle: "",
  body: "",
  bullets: [],
  actionKind: null,
  actionLabel: "",
  isActive: true,
  ...extra,
});

describe("el celular enseña la pantalla COMPLETA con tu cambio dentro", () => {
  const publicadas = [
    pieza({ contentKey: "a", title: "Pregunta A", body: "Respuesta A" }),
    pieza({ contentKey: "b", title: "Pregunta B", body: "Respuesta B" }),
  ];

  it("las demás preguntas siguen ahí y la que se edita sale abierta con lo escrito", () => {
    renderWithProviders(
      <PhonePreview
        surface="faq"
        surfaceLabel="Preguntas"
        draft={pieza({
          contentKey: "b",
          title: "Pregunta B",
          body: "Texto nuevo",
        })}
        published={publicadas}
      />,
    );
    const celular = screen.getByTestId("app-content-phone");
    expect(celular).toHaveTextContent("Pregunta A");
    expect(celular).toHaveTextContent("Texto nuevo");
    expect(celular).not.toHaveTextContent("Respuesta B");
    expect(celular).not.toHaveTextContent("Respuesta A");
  });

  it("una pieza oculta se quita del celular y se avisa", () => {
    renderWithProviders(
      <PhonePreview
        surface="faq"
        surfaceLabel="Preguntas"
        draft={pieza({
          contentKey: "b",
          title: "Pregunta B",
          body: "x",
          isActive: false,
        })}
        published={publicadas}
      />,
    );
    expect(screen.getByTestId("phone-oculta")).toBeInTheDocument();
    expect(screen.getByTestId("app-content-phone")).not.toHaveTextContent(
      "Pregunta B",
    );
  });
});

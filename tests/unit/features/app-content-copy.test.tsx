import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EntryEditor } from "@/features/app-content/entry-editor";
import {
  PhonePreview,
  type PreviewDraft,
} from "@/features/app-content/phone-preview";
import { SURFACES } from "@/features/app-content/surfaces";
import type { AppContentEntry } from "@/features/app-content/types";
import { renderWithProviders } from "../../helpers/render-with-providers";

const save = vi.fn();
vi.mock("@/features/app-content/hooks", () => ({
  useSaveAppContent: () => ({ mutate: save, isPending: false, error: null }),
}));

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

describe("la pestaña «Textos de pantallas»", () => {
  it("existe y la app la lee", () => {
    expect(
      SURFACES.find((superficie) => superficie.value === "copy"),
    ).toMatchObject({
      label: "Textos de pantallas",
      readByApp: true,
    });
  });

  it("el celular agrupa los textos por pantalla y dice dónde sale cada uno", () => {
    renderWithProviders(
      <PhonePreview
        surface="copy"
        surfaceLabel="Textos de pantallas"
        draft={null}
        published={[
          pieza({
            contentKey: "inicio.calculando",
            body: "Todavía estamos calculando tu línea.",
            meta: { pantalla: "Inicio", donde: "Bajo «Tu línea»" },
          }),
          pieza({
            contentKey: "pagos.vacio",
            title: "Todavía no hay cuotas",
            body: "Cuando compres, verás tus pagos.",
            meta: { pantalla: "Pagos", donde: "Cuando no hay cuotas" },
          }),
        ]}
      />,
    );
    const copia = screen.getByTestId("phone-screen-copy");
    expect(copia).toHaveTextContent("Inicio");
    expect(copia).toHaveTextContent("Pagos");
    expect(copia).toHaveTextContent("Bajo «Tu línea»");
    expect(copia).toHaveTextContent("Todavía no hay cuotas");
  });
});

describe("editar un texto suelto", () => {
  const entry: AppContentEntry = {
    contentId: "1",
    surface: "copy",
    contentKey: "pagos.vacio",
    locale: "es-BO",
    title: "Todavía no hay cuotas",
    subtitle: null,
    bodyMd: "Cuando compres, verás tus pagos.",
    bullets: [],
    metadata: {
      pantalla: "Pagos",
      donde: "Cuando no hay cuotas",
      otra: "se conserva",
    },
    actionKind: null,
    actionLabel: null,
    actionValue: null,
    resolvedAction: null,
    displayOrder: 40,
    isActive: true,
    publishedAt: null,
    updatedAt: null,
  };

  it("sólo ofrece título y texto, y dice dónde sale; no hay lista, botón ni subtítulo", () => {
    renderWithProviders(
      <EntryEditor entry={entry} onClose={() => {}} onDraftChange={() => {}} />,
    );
    expect(screen.getByTestId("copy-donde")).toHaveTextContent(
      "Cuando no hay cuotas",
    );
    expect(screen.getByTestId("body-pagos.vacio")).toBeInTheDocument();
    expect(screen.queryByTestId("subtitle-pagos.vacio")).toBeNull();
    expect(screen.queryByText("Lista de puntos")).toBeNull();
    expect(screen.queryByTestId("add-bullet-pagos.vacio")).toBeNull();
    expect(screen.queryByText("Tipo de botón")).toBeNull();
  });

  it("guarda el texto y conserva la metadata (pantalla, dónde) intacta", async () => {
    renderWithProviders(
      <EntryEditor entry={entry} onClose={() => {}} onDraftChange={() => {}} />,
    );
    fireEvent.change(screen.getByTestId("body-pagos.vacio"), {
      target: { value: "Texto nuevo." },
    });
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls.at(-1)?.[0]).toMatchObject({
      surface: "copy",
      contentKey: "pagos.vacio",
      bodyMd: "Texto nuevo.",
      metadata: {
        pantalla: "Pagos",
        donde: "Cuando no hay cuotas",
        otra: "se conserva",
      },
    });
  });

  it("las demás superficies siguen viendo la lista, el botón y el subtítulo", () => {
    renderWithProviders(
      <EntryEditor
        entry={{ ...entry, surface: "faq", contentKey: "faq.uno" }}
        onClose={() => {}}
        onDraftChange={() => {}}
      />,
    );
    expect(screen.getByTestId("subtitle-faq.uno")).toBeInTheDocument();
    expect(screen.getByTestId("add-bullet-faq.uno")).toBeInTheDocument();
    expect(screen.getByText("Tipo de botón")).toBeInTheDocument();
  });
});

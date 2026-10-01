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

describe("las superficies nuevas del portal", () => {
  it("el recorrido, las promesas del alta y privacidad tienen su pestaña; pagos aún no (la app no la lee)", () => {
    const valores = SURFACES.map((superficie) => superficie.value);
    expect(valores).toEqual(
      expect.arrayContaining(["tour", "signup", "privacy"]),
    );
    expect(valores).not.toContain("payments");
  });

  it("el recorrido pinta una tarjeta por paso con su icono", () => {
    renderWithProviders(
      <PhonePreview
        surface="tour"
        surfaceLabel="Recorrido guiado"
        draft={null}
        published={[
          pieza({
            contentKey: "inicio.linea",
            icon: "billetera",
            title: "Esto es lo que puedes gastar hoy",
            body: "Tu disponible…",
          }),
          pieza({
            contentKey: "inicio.pagos",
            icon: "escudo",
            title: "Tus cuotas se pagan al comercio",
            body: "Atlas nunca recibe tu dinero",
          }),
        ]}
      />,
    );
    const tour = screen.getByTestId("phone-screen-tour");
    expect(tour).toHaveTextContent("Esto es lo que puedes gastar hoy");
    expect(tour).toHaveTextContent("Atlas nunca recibe tu dinero");
  });

  it("las promesas se agrupan por pantalla del alta y enseñan sus garantías como etiquetas", () => {
    renderWithProviders(
      <PhonePreview
        surface="signup"
        surfaceLabel="Alta"
        draft={null}
        published={[
          pieza({
            contentKey: "registro.4",
            icon: "candado",
            title: "Tu PIN de 4 dígitos",
            body: "Impide que alguien compre en tu nombre.",
            bullets: [{ text: "No se guarda", icon: "escudo" }],
          }),
          pieza({
            contentKey: "economia.1",
            icon: "billetera",
            title: "Cuánto ingresas",
            body: "Fija una cuota que puedas pagar.",
            bullets: [{ text: "Lo decide el motor", icon: "chispa" }],
          }),
        ]}
      />,
    );
    const alta = screen.getByTestId("phone-screen-signup");
    expect(alta).toHaveTextContent("Crear tu cuenta");
    expect(alta).toHaveTextContent("Tu situación económica");
    expect(alta).toHaveTextContent("No se guarda");
    expect(alta).toHaveTextContent("Lo decide el motor");
  });

  it("privacidad enseña la cabecera, los derechos y los avisos", () => {
    renderWithProviders(
      <PhonePreview
        surface="privacy"
        surfaceLabel="Privacidad"
        draft={null}
        published={[
          pieza({
            contentKey: "cabecera",
            title: "Tus datos",
            subtitle: "Que permisos diste",
          }),
          pieza({
            contentKey: "derechos",
            title: "Pedir algo sobre tus datos",
            body: "Plazo de 15 días",
          }),
          pieza({
            contentKey: "derecho.access",
            title: "Ver mis datos",
            subtitle: "Que se sabe de mi",
          }),
          pieza({
            contentKey: "solicitud.enviada",
            body: "Tu solicitud quedó registrada",
          }),
        ]}
      />,
    );
    const privacidad = screen.getByTestId("phone-screen-privacy");
    expect(privacidad).toHaveTextContent("Tus datos");
    expect(privacidad).toHaveTextContent("Ver mis datos");
    expect(privacidad).toHaveTextContent("Tu solicitud quedó registrada");
  });
});

describe("el icono de la pieza (recorrido y promesas)", () => {
  const entry = (surface: "tour" | "faq"): AppContentEntry => ({
    contentId: "1",
    surface,
    contentKey: "inicio.linea",
    locale: "es-BO",
    title: "Paso",
    subtitle: null,
    bodyMd: "Texto",
    bullets: [],
    metadata: { icon: "billetera", otraClave: "se conserva" },
    actionKind: null,
    actionLabel: null,
    actionValue: null,
    resolvedAction: null,
    displayOrder: 10,
    isActive: true,
    publishedAt: null,
    updatedAt: null,
  });

  it("en el recorrido se elige el icono de la pieza y se guarda en metadata sin perder el resto", async () => {
    renderWithProviders(
      <EntryEditor
        entry={entry("tour")}
        onClose={() => {}}
        onDraftChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("pieza-icono-inicio.linea-boton"));
    fireEvent.click(
      screen.getByTestId("pieza-icono-inicio.linea-icono-escudo"),
    );
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls.at(-1)?.[0].metadata).toEqual({
      icon: "escudo",
      otraClave: "se conserva",
    });
  });

  it("en una superficie que no pinta icono por pieza no aparece el campo", () => {
    renderWithProviders(
      <EntryEditor
        entry={entry("faq")}
        onClose={() => {}}
        onDraftChange={() => {}}
      />,
    );
    expect(screen.queryByTestId("pieza-icono-inicio.linea-boton")).toBeNull();
  });

  it("el selector de la pieza no ofrece cargar un icono propio (eso es de los puntos de lista)", () => {
    renderWithProviders(
      <EntryEditor
        entry={entry("tour")}
        onClose={() => {}}
        onDraftChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("pieza-icono-inicio.linea-boton"));
    expect(screen.queryByText("Cargar el tuyo")).toBeNull();
  });
});

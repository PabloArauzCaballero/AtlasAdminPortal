import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PhonePreview,
  type PreviewDraft,
} from "@/features/app-content/phone-preview";

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

const publicado = [
  pieza({
    contentKey: "eslogan",
    title: "Eslogan",
    subtitle: "Tu primer crédito.",
    body: "Para comprar en Santa Cruz.",
  }),
  pieza({
    contentKey: "paso-1",
    title: "Escaneas y listo",
    subtitle: "Escaneas el QR y escribes el monto.",
  }),
  pieza({
    contentKey: "paso-2",
    title: "Pagas en cuotas",
    subtitle: "Cuotas mensuales.",
  }),
];

function celular(published: PreviewDraft[], draft: PreviewDraft | null = null) {
  return render(
    <PhonePreview
      surface="onboarding"
      surfaceLabel="Bienvenida"
      draft={draft}
      published={published}
    />,
  );
}

describe("la Bienvenida en el celular del portal", () => {
  it("empieza por la marca y el eslogan, como la app, no por una lista", () => {
    celular(publicado);
    expect(screen.getByTestId("phone-screen-onboarding")).toBeInTheDocument();
    expect(screen.getByText("ATLAS")).toBeInTheDocument();
    expect(screen.getByText("Tu primer crédito.")).toBeInTheDocument();
    // La pieza «Eslogan» no es un paso: su título interno no sale en pantalla.
    expect(screen.queryByText("Eslogan")).toBeNull();
    expect(screen.queryByText("Escaneas y listo")).toBeNull();
  });

  it("«Siguiente» pasa de página y la última ofrece «Crear mi cuenta»", () => {
    celular(publicado);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Escaneas y listo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Pagas en cuotas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear mi cuenta" }),
    ).toBeInTheDocument();
  });

  it("un paso sin cuerpo no se pinta: la app lo descarta", () => {
    celular([
      ...publicado,
      pieza({ contentKey: "paso-3", title: "Sin texto" }),
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.queryByText("Sin texto")).toBeNull();
  });

  it("al editar un paso se enseña ese paso, con su icono propio si lo tiene", () => {
    celular(
      publicado,
      pieza({
        contentKey: "paso-1",
        title: "Escaneas y listo",
        subtitle: "Texto nuevo.",
        bullets: [
          { text: "x", iconImage: "data:image/png;base64,iVBORw0KGgo=" },
        ],
      }),
    );
    expect(screen.getByText("Texto nuevo.")).toBeInTheDocument();
    expect(document.querySelector('img[src^="data:image/png"]')).not.toBeNull();
  });
});

describe("los iconos de la app portados al celular", () => {
  it("están todos los de la app y los que usa la Bienvenida existen", async () => {
    const { APP_ICON_NAMES } = await import("@/features/app-content/app-icons");
    expect([...APP_ICON_NAMES].sort()).toEqual([
      "adelante",
      "alerta",
      "asistente",
      "atras",
      "ayuda",
      "billetera",
      "camara",
      "candado",
      "celulares",
      "check",
      "chispa",
      "comercio",
      "copiar",
      "cuadricula",
      "descargar",
      "documento",
      "editar",
      "educacion",
      "electronica",
      "escanear",
      "escudo",
      "estrella",
      "etiqueta",
      "filtro",
      "grafico",
      "hogar",
      "info",
      "inicio",
      "lista",
      "ojo",
      "ojo-tachado",
      "pagos",
      "perfil",
      "refrescar",
      "reloj",
      "ropa",
      "salir",
      "salud",
      "servicios",
      "sobre",
      "supermercado",
      "telefono",
      "tendencia",
      "transporte",
      "ubicacion",
    ]);
  });
});

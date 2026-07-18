"use client";

/**
 * Boundary de último recurso: se activa cuando falla el propio RootLayout, así
 * que reemplaza al layout y debe traer su propio <html>/<body>. Por eso no puede
 * depender de globals.css ni de componentes que sí lo asumen: estilos en línea.
 */
export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0f172a",
          color: "#e2e8f0",
        }}
      >
        <main
          style={{ maxWidth: "28rem", padding: "2rem", textAlign: "center" }}
        >
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 .5rem" }}>
            El portal encontró un error grave
          </h1>
          <p
            style={{ color: "#94a3b8", lineHeight: 1.6, margin: "0 0 1.5rem" }}
          >
            No se pudo cargar la aplicación. Intenta recargar; si el problema
            persiste, avisa a soporte.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: ".75rem",
                color: "#64748b",
                margin: "0 0 1.5rem",
              }}
            >
              Referencia: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: ".6rem 1.2rem",
              borderRadius: ".5rem",
              border: "1px solid #334155",
              background: "#4f46e5",
              color: "#fff",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}

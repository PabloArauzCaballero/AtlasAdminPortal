import type { MetadataRoute } from "next";

/**
 * Permite instalar el portal en la pantalla de inicio del teléfono.
 *
 * `start_url` entra por `/internal`, que redirige al login si no hay sesión: la app instalada no
 * tiene un camino distinto de acceso. No registra service worker ni cachea nada: un portal de
 * operaciones que enseña datos viejos sin avisar es peor que uno que dice «sin conexión».
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ATLAS Portal Interno",
    short_name: "ATLAS",
    description:
      "Portal interno de sistemas, QA, catálogo de datos y auditoría de ATLAS.",
    lang: "es",
    start_url: "/internal",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#f5f5f7",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

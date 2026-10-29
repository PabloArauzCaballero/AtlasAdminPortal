import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATLAS Portal Interno",
  description:
    "Portal interno de sistemas, QA, catálogo de datos y auditoría de ATLAS.",
  // El logo de la app móvil, servido desde `public/`: es el icono de la pestaña en todos los portales.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

/**
 * `viewport-fit=cover` es lo que hace que los `env(safe-area-inset-*)` del portal valgan algo:
 * sin él, un iPhone con muesca devuelve 0 y la barra inferior y las cabeceras no respetan el
 * recorte. Va junto al `padding` seguro que ya llevan `atlas-safe-top` y `AppShell`.
 *
 * El zoom queda habilitado (sin `maximumScale`): bloquearlo incumple WCAG 1.4.4. El color de la
 * barra del sistema es el del lienzo (`atlas-bg`), para que la app instalada no tenga franja.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#f5f5f7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

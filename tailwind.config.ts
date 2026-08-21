import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /*
         * El lenguaje visual de ATLAS, traído desde el motor de decisión.
         *
         * Los valores salen de `AtlasDecisionEngineFrontend/src/styles/parts/theme.css`, donde
         * `theme-contrast.test.ts` los mide contra TODAS las superficies del sistema y falla si
         * alguno baja de 4,5:1. Aclarar uno aquí rompe esa garantía en silencio.
         *
         * Este portal ya pintaba con tokens semánticos —581 usos de `atlas-*`— así que cambiar sus
         * VALORES traslada el aspecto entero sin editar un solo componente. Es justo lo que un
         * sistema de tokens existe para permitir.
         */
        atlas: {
          bg: "#f5f5f7", // --canvas
          card: "#ffffff", // --surface
          border: "#e4e4e7", // --line
          muted: "#5a5a63", // --muted
          text: "#1d1d1f", // --ink
          soft: "#f0f0f3", // --surface-hover
          primary: "#1d1d1f", // --ink
          /*
           * El acento deja de ser el índigo `#4F46E5` y pasa al verde azulado del motor:
           * profundo y poco saturado a propósito, porque en este sistema el color es SEÑAL y un
           * acento que grita compite con los estados que sí tienen algo que decir.
           */
          accent: "#006a61", // --accent
          accentSoft: "#d9ebe8", // --accent-soft
          accentWash: "#f0f8f7", // --accent-wash
          success: "#0f7b52",
          warning: "#a34a05",
          critical: "#b42318", // --danger
          info: "#1f6fb2",
          pii: "#6b3fa0",
          sensitive: "#a3195b",
        },
        /*
         * La rampa neutra del motor sustituye a la de Tailwind: los 121 `slate-*` que ya existen
         * en los componentes quedan pintados con el gris de ATLAS sin tocarlos.
         */
        slate: {
          50: "#fafafa",
          100: "#f5f5f7",
          200: "#e4e4e7",
          300: "#c9c9cf",
          400: "#9a9aa3",
          500: "#6b6b75",
          600: "#5a5a63",
          700: "#38383d",
          800: "#26262a",
          900: "#1d1d1f",
          950: "#0b0b0c",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-ui)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 8px 20px rgba(15, 23, 42, 0.04)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 28px -12px rgba(15, 23, 42, 0.12)",
        "card-hover":
          "0 4px 10px rgba(15, 23, 42, 0.06), 0 20px 40px -16px rgba(15, 23, 42, 0.18)",
        glow: "0 0 0 1px rgba(0, 106, 97, 0.10), 0 8px 24px -8px rgba(0, 106, 97, 0.30)",
      },
      backgroundImage: {
        /*
         * El adorno lleva tonos del propio acento, no un color nuevo. Antes era una malla índigo
         * (`#1e1b4b` → `#312e81`) que no aparecía en ninguna otra parte del producto: la portada
         * del acceso pertenecía a otra marca que el resto del portal.
         */
        "atlas-radial":
          "radial-gradient(circle at top left, rgba(0,106,97,0.14), transparent 55%)",
        "atlas-mesh":
          "linear-gradient(135deg, #12181a 0%, #10322f 48%, #00544d 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(-4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "70%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "bell-ring": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(14deg)" },
          "30%": { transform: "rotate(-12deg)" },
          "45%": { transform: "rotate(8deg)" },
          "60%": { transform: "rotate(-6deg)" },
          "75%": { transform: "rotate(3deg)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "route-progress": {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(60%)" },
          "100%": { transform: "translateX(300%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "slide-up": "slide-up 0.4s ease-out both",
        "scale-in": "scale-in 0.2s ease-out both",
        pop: "pop 0.3s ease-out both",
        "bell-ring": "bell-ring 0.9s ease-in-out 1",
        shimmer: "shimmer 1.6s infinite linear",
        "route-progress": "route-progress 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

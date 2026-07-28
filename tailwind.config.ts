import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        atlas: {
          bg: "#F6F7F8",
          card: "#FFFFFF",
          border: "#E1E3E8",
          muted: "#686B73",
          text: "#18191D",
          soft: "#F1F2F4",
          primary: "#18191D",
          accent: "#405CCB",
          accentSoft: "#EEF1FC",
          success: "#16875A",
          warning: "#B66A00",
          critical: "#CE3E36",
          info: "#356FC0",
          pii: "#6656C7",
          sensitive: "#B44A78",
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
        subtle: "0 1px 2px rgba(24, 25, 29, 0.04)",
        card: "0 1px 2px rgba(24, 25, 29, 0.04), 0 6px 18px -14px rgba(24, 25, 29, 0.24)",
        "card-hover":
          "0 1px 2px rgba(24, 25, 29, 0.06), 0 10px 24px -16px rgba(24, 25, 29, 0.28)",
        glow: "0 0 0 3px rgba(64, 92, 203, 0.12)",
      },
      backgroundImage: {
        "atlas-radial":
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 55%)",
        "atlas-mesh": "linear-gradient(180deg, #191A1E 0%, #121316 100%)",
        // Superficie del hero de autenticación: malla oscura con auroras sutiles.
        "atlas-aurora":
          "radial-gradient(60% 80% at 15% 10%, rgba(64,92,203,0.30), transparent 60%), radial-gradient(55% 70% at 85% 25%, rgba(102,86,199,0.26), transparent 60%), radial-gradient(60% 60% at 60% 100%, rgba(53,111,192,0.22), transparent 60%), linear-gradient(180deg, #16171C 0%, #101115 100%)",
        // Degradado de marca reutilizable para acentos y botones destacados.
        "brand-gradient": "linear-gradient(135deg, #405CCB 0%, #6656C7 100%)",
        // Malla ambiental muy tenue para el fondo de la app (modo claro).
        "app-ambient":
          "radial-gradient(50% 60% at 100% 0%, rgba(64,92,203,0.06), transparent 55%), radial-gradient(45% 55% at 0% 100%, rgba(102,86,199,0.05), transparent 55%)",
      },
      keyframes: {
        // Movimiento orgánico lento para formas abstractas del fondo (solo
        // transform → compositor, sin repaints).
        blob: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(24px,-20px) scale(1.06)" },
          "66%": { transform: "translate(-18px,14px) scale(0.96)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.6" },
        },
        "float-in": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.98) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "drawer-in": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
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
        "fade-in": "fade-in 0.16s ease-out both",
        "slide-up": "slide-up 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.16s cubic-bezier(0.16, 1, 0.3, 1) both",
        "drawer-in": "drawer-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
        pop: "pop 0.3s ease-out both",
        "bell-ring": "bell-ring 0.9s ease-in-out 1",
        shimmer: "shimmer 1.6s infinite linear",
        "route-progress": "route-progress 0.9s ease-in-out infinite",
        blob: "blob 20s ease-in-out infinite",
        "blob-slow": "blob 30s ease-in-out infinite",
        float: "float 8s ease-in-out infinite",
        "glow-pulse": "glow-pulse 6s ease-in-out infinite",
        "float-in": "float-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "spin-slow": "spin-slow 32s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;

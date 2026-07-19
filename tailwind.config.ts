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
      },
      keyframes: {
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
      },
    },
  },
  plugins: [],
};

export default config;

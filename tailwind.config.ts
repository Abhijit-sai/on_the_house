import forms from "@tailwindcss/forms";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#070707",
        surface: "#121212",
        elevated: "#1B1B1B",
        "gold-tint": "#211707",
        red: {
          brand: "#D72638",
          deep: "#7A101C",
          danger: "#FF4D5A",
        },
        gold: {
          brand: "#F5B942",
          deep: "#B8872B",
        },
        cream: "#FFF4D6",
        muted: "#9C9587",
        success: "#00D17A",
        warning: "#FFB020",
        border: "rgba(255, 244, 214, 0.12)",
      },
      boxShadow: {
        glow: "0 0 32px rgba(245, 185, 66, 0.18)",
        "red-glow": "0 0 28px rgba(215, 38, 56, 0.22)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [forms],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        foreground: "#111827",
        border: "#E5E7EB",
        muted: "#6B7280",
        primary: {
          DEFAULT: "#1F3A8A",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#C9A227",
          foreground: "#111827",
        },
        success: {
          DEFAULT: "#16A34A",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#111827",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;


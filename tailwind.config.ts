import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        muted: "#667085",
        line: "#D9E2EC",
        surface: "#F7FAFC",
        brand: {
          50: "#ECFEFF",
          100: "#CFFAFE",
          500: "#0891B2",
          600: "#0E7490",
          700: "#155E75",
        },
        good: "#15803D",
        warn: "#B45309",
        danger: "#B91C1C",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;


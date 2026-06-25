import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Corporate-Blau aus dem GA-BA-Logo
        gaba: {
          DEFAULT: "#1a2a8f",
          dark: "#13205f",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

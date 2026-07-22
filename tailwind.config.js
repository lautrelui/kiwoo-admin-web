/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf3",
          100: "#d6f9e1",
          200: "#aff1c5",
          300: "#7be3a3",
          400: "#43cd7e",
          500: "#1cb464",
          600: "#11924f",
          700: "#0f7340",
          800: "#105b35",
          900: "#0e4a2d",
        },
        ink: {
          900: "#0b1220",
          800: "#101a2c",
          700: "#162036",
          600: "#1e2b47",
          500: "#334466",
          400: "#5b6b8c",
          300: "#8a98b6",
          200: "#c1cadd",
          100: "#e6ebf5",
          50: "#f5f7fb",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,26,44,0.04), 0 6px 24px rgba(16,26,44,0.06)",
      },
    },
  },
  plugins: [],
};

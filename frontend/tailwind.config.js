/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1917",
        paper: "#f6f1e8",
        brand: {
          50: "#eef2ff",
          500: "#4f46e5",
          600: "#4338ca",
          700: "#3730a3",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -18px rgba(28, 25, 23, 0.35)",
      },
    },
  },
  plugins: [],
};

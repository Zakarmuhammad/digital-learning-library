import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f4",
          600: "#0f5132",
          700: "#0c3f27",
        },
      },
    },
  },
  plugins: [],
};
export default config;

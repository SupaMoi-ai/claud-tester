import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F4EC",
        ink: "#1C1B17",
        "zone-free": "#3A8A4A",
        "zone-limited": "#C68A1F",
        "zone-restricted": "#B0463C",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        faida: {
          green: "#047857",
          navy: "#0F172A",
          teal: "#0F766E",
          slate: "#475569",
        },
      },
      boxShadow: {
        soft: "0 18px 52px -30px rgba(15, 23, 42, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;

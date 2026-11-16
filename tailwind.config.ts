import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        faida: {
          green: "#10B981",
          navy: "#0F172A",
          teal: "#14B8A6",
          slate: "#64748B",
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

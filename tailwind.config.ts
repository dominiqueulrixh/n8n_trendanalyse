import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07111f"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(59,130,246,0.18), 0 24px 80px rgba(2,6,23,0.35)"
      }
    }
  },
  plugins: []
};

export default config;

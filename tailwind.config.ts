import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#fdf6e3",
        foreground: "#233038",
        primary: {
          DEFAULT: "#FF5B04",
          foreground: "#FDF6E3",
        },
        secondary: {
          DEFAULT: "#075056",
          foreground: "#FDF6E3",
        },
        accent: {
          DEFAULT: "#F4D47C",
          foreground: "#233038",
        },
        muted: {
          DEFAULT: "#D3DBDD",
          foreground: "#233038",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#233038",
        },
        border: "#d3dbdd",
      },
      fontFamily: {
        outfit: ["var(--font-outfit)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config 
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3C3C3C",
        secondary: "#777777",
        tertiary: {
          DEFAULT: "#58CC02",
          hover: "#61E002",
          dark: "#46A302",
          light: "#D7FFB8",
        },
        neutral: {
          DEFAULT: "#F7F7F7",
          dark: "#E5E5E5",
        },
        surface: "#FFFFFF",
        "on-primary": "#FFFFFF",
      },
      fontFamily: {
        sans: ["Nunito", "sans-serif"],
        display: ["Nunito", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        chunky: "0 4px 0 0 #46A302",
        "chunky-neutral": "0 4px 0 0 #E5E5E5",
        "chunky-card": "0 4px 0 0 #E5E5E5",
        "chunky-danger": "0 4px 0 0 #D93838",
      },
    },
  },
  plugins: [],
};
export default config;


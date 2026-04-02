/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--surface)",
          dim: "var(--surface-dim)",
          bright: "var(--surface-bright)",
          container: {
            DEFAULT: "var(--surface-container)",
            low: "var(--surface-container-low)",
            high: "var(--surface-container-high)",
            highest: "var(--surface-container-highest)",
            lowest: "var(--surface-container-lowest)",
          },
          variant: "var(--surface-container)",
          tint: "#4963ff",
        },
        primary: {
          DEFAULT: "#4963ff",
          dim: "#3047d1",
          fixed: "#8999ff",
          "fixed-dim": "#778aff",
          container: "#E9EDFF",
        },
        tertiary: {
          DEFAULT: "#c500e6",
          dim: "#9b00b5",
          fixed: "#f189ff",
          "fixed-dim": "#eb71ff",
          container: "#F8E6FF",
        },
        secondary: {
          DEFAULT: "#e70052",
          dim: "#bd0041",
          fixed: "#ffc2c7",
          "fixed-dim": "#ffaeb6",
          container: "#FFE9EB",
        },
        error: {
          DEFAULT: "#ff3b30",
          dim: "#d73357",
          container: "#FFECEC",
        },
        onSurface: {
          DEFAULT: "var(--on-surface)",
          variant: "var(--on-surface-variant)",
        },
        onBackground: "var(--on-surface)",
        outline: {
          DEFAULT: "var(--outline)",
          variant: "var(--outline-variant)",
        },
        // Legacy snapchat colors (for backward compat)
        snapchat: {
          yellow: "#FFFC00",
          blue: "#00ABF0",
          purple: "#9B59B6",
          red: "#FF1053",
          green: "#00D26A",
          dark: "#1E1E1E",
          gray: "#AFAFAF",
          lightGray: "#F2F2F2",
        },
        brand: {
          primary: "#9ba8ff",
          secondary: "#4963ff",
          accent: "#e966ff",
        }
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      spacing: {
        '18': '72px',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ChatSnap "Bright & Airy" Design System (Light Theme)
        surface: {
          DEFAULT: "#FFFFFF",
          dim: "#F8F9FF",
          bright: "#F0F3FF",
          container: {
            DEFAULT: "#F1F4FF",
            low: "#F8F9FE",
            high: "#E9EDFF",
            highest: "#DFE5FF",
            lowest: "#FFFFFF",
          },
          variant: "#F1F4FF",
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
          DEFAULT: "#1A1C1E",
          variant: "#64748B",
        },
        onBackground: "#1A1C1E",
        outline: {
          DEFAULT: "#CBD5E1",
          variant: "#E2E8F0",
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

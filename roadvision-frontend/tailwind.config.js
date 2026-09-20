/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#004ac6",
        "primary-container": "#2563eb",
        "primary-fixed": "#dbe1ff",
        "on-primary": "#ffffff",
        "secondary": "#006398",
        "secondary-fixed": "#cce5ff",
        "surface": "#f8f9ff",
        "surface-container": "#e5eeff",
        "surface-container-low": "#eff4ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "on-surface": "#0b1c30",
        "on-surface-variant": "#434655",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "outline-variant": "#c3c6d7",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      }
    },
  },
  plugins: [],
}

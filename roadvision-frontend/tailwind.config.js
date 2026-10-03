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
        "primary": "#1d4ed8",
        "primary-container": "#2563eb",
        "primary-fixed": "#dbeafe",
        "on-primary": "#ffffff",
        "secondary": "#334155",
        "secondary-fixed": "#e2e8f0",
        "surface": "#f8fafc",
        "surface-container": "#e2e8f0",
        "surface-container-low": "#f1f5f9",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#cbd5e1",
        "surface-container-highest": "#94a3b8",
        "on-surface": "#0f172a",
        "on-surface-variant": "#475569",
        "error": "#dc2626",
        "error-container": "#fee2e2",
        "outline-variant": "#cbd5e1",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        display: ["Inter", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      }
    },
  },
  plugins: [],
}

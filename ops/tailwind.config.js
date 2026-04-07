/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0c0c0f",
        "bg-card": "#141419",
        "bg-hover": "#1a1a22",
        border: "#2a2a35",
        "text-primary": "#e4e4e7",
        "text-dim": "#7a7a86",
        steel: "#5b8dce",
        green: "#22c55e",
        red: "#ef4444",
        amber: "#f59e0b",
        purple: "#a855f7",
        cyan: "#06b6d4",
      },
      fontFamily: {
        mono: ['"Space Mono"', '"JetBrains Mono"', "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "slide-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}

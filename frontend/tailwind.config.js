/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          text: '#f8fafc',
          muted: '#94a3b8'
        },
        risk: {
          critical: '#ef4444',
          veryhigh: '#f97316',
          high: '#f59e0b',
          moderate: '#eab308',
          low: '#22c55e',
          info: '#3b82f6'
        }
      }
    },
  },
  plugins: [],
}

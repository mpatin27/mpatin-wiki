/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wiki: {
          bg: '#0f172a',      // Slate 900 (Fond principal)
          surface: '#1e293b', // Slate 800 (Panneaux, Sidebar)
          border: '#334155',  // Slate 700 (Bordures subtiles)
          text: '#f8fafc',    // Slate 50 (Texte principal)
          muted: '#94a3b8',   // Slate 400 (Texte secondaire)
          accent: '#38bdf8',  // Sky 400 (Couleur d'accentuation moderne)
        }
      },
      fontFamily: {
        // On garde une police mono pour le code, mais on peut utiliser 'sans' pour le reste si voulu
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'], 
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
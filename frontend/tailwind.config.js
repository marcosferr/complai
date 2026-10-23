/** @type {import('tailwindcss').Config} */
// ──────────────────────────────────────────────────────────────
// Branding Universidad Nacional de Itapúa (UNI) — white label.
// Paleta tomada de uni.edu.py y del escudo institucional:
//   bordó institucional  #AE152D / #9D2235
//   ladrillo del escudo  #CC6633
//   dorado "30 años"     #C8860A
//   crema del escudo     #FBF3E4
// Para otra institución basta con cambiar estos tokens y src/config/brand.js.
// ──────────────────────────────────────────────────────────────
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Tokens de marca UNI ──
        primary: '#AE152D',           // Bordó institucional
        'primary-hover': '#9D2235',   // Bordó oscuro (hover)
        'primary-dark': '#7E1024',    // Variante oscura
        'primary-light': '#CC6633',   // Ladrillo del escudo
        'primary-soft': '#FBEAEC',    // Fondo bordó suave
        'brand-light': '#FBF3E4',     // Crema del escudo
        'brand-dark': '#252525',      // Negro suave
        'brand-secondary': '#CC6633', // Acento principal - ladrillo
        'brand-secondary-light': '#E08A5C', // Ladrillo claro
        'accent-yellow': '#C8860A',   // Dorado
        'background-light': '#FAFAF8', // Neutro cálido
        'background-dark': '#1C1A1A', // Fondo oscuro
        'background-tint': '#FBF3E4', // Crema
        'surface-light': '#FFFFFF',   // Superficie
        'surface-dark': '#2A2626',    // Superficie oscura
        'neutral-surface': '#F5F0EA', // Fondo suave
        'text-light': '#252525',      // Texto sobre claro
        'text-dark': '#F5F5F5',       // Texto sobre oscuro
        'subtle-light': '#696969',    // Texto secundario
        'subtle-dark': '#ABABAB',     // Texto secundario (oscuro)
        'border-light': '#EDE6DD',    // Bordes
        'border-dark': '#4A3F3F',     // Bordes (oscuro)
        warning: '#B45309',
        'warning-accent': '#F59E0B',
        danger: '#B91C1C',
        error: '#B91C1C',
        success: '#15803D',           // Verde semáforo: "normal"
        audit: '#CC6633',
        'status-progress-bg': '#FBEAEC',
        'status-progress-text': '#AE152D',
        'status-progress-border': '#AE152D',
        'status-pendiente-bg': '#FEF9C3',
        'status-pendiente-text': '#B45309',
        'status-pendiente-badge': '#C8860A',
        'status-alert-bg': '#FEE2E2',
        'status-alert-text': '#B91C1C',
        'status-observado-bg': '#FFEDD5',
        'status-observado-text': '#C2410C',
        'sidebar-active-text': '#AE152D',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
}

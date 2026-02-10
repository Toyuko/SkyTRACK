/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        jal: {
          red: '#C8102E',
          'red-dark': '#A00D24',
          'red-light': '#E8334D',
          navy: '#0B1026',
          'navy-light': '#141B3D',
          'navy-mid': '#1C2444',
          silver: '#E8E9ED',
          gold: '#B8860B',
          'gold-light': '#D4A843',
          white: '#FFFFFF',
          crane: '#F5F0E8',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans JP"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'jal': '0 4px 24px rgba(200, 16, 46, 0.12)',
        'jal-lg': '0 8px 40px rgba(200, 16, 46, 0.18)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.37)',
        'glass-sm': '0 2px 16px rgba(0, 0, 0, 0.25)',
        'glow-red': '0 0 40px rgba(200, 16, 46, 0.3)',
        'glow-cyan': '0 0 40px rgba(34, 211, 238, 0.2)',
      },
      animation: {
        'spotlight': 'spotlight 2s ease .75s 1 forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        spotlight: {
          '0%': { opacity: 0, transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: 1, transform: 'translate(-50%, -40%) scale(1)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(200, 16, 46, 0.1)' },
          '100%': { boxShadow: '0 0 40px rgba(200, 16, 46, 0.3)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}

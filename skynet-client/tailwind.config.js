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
        skynet: {
          primary: '#2563eb',
          secondary: '#1e40af',
          accent: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f0ff',
          100: '#e0e0ff',
          500: '#1A1A2E',
          600: '#4A4A6A',
          accent: '#E94560',
        },
      },
    },
  },
  plugins: [],
}

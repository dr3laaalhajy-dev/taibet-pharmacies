/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 🟢 هذا هو السطر المسؤول عن الوضع الليلي
  theme: {
    extend: {},
  },
  plugins: [],
}
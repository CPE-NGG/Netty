/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      },
    },
  },
  plugins: [],
}
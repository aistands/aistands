/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1E3E',
          mid: '#132952',
          light: '#1C3A70',
        },
        electric: {
          DEFAULT: '#1E8AFF',
          bright: '#4FA8FF',
        },
        slate: {
          ai: '#8DA3C0',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Epilogue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Epilogue', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        orange: {
          DEFAULT: '#E8631A',
          bright:  '#F57332',
          deep:    '#C4510E',
        },
        navy: {
          DEFAULT: '#0B1E3E',
          mid:     '#132952',
        },
      },
      letterSpacing: {
        tight: '-0.03em',
        tighter: '-0.04em',
      },
    },
  },
  plugins: [],
}
export default config

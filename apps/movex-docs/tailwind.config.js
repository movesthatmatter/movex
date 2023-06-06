module.exports = {
  mode: 'jit',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  purge: {
    content: [
      './app/**/*.{js,ts,jsx,tsx,mdx}',
      './pages/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
      './modules/**/*.{js,ts,jsx,tsx,mdx}',
    ],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    fontFamily: {
      display: ['inter', 'sans-serif'],
    },
    letterSpacing: {
      tight: '-0.015em',
    },

    extend: {
      colors: {
        movexBlue: {
          100: '#e4f2fd',
          200: '#afd8fa',
          300: '#7abdf6',
          400: '#45a3f2',
          500: '#339AF1',
          600: '#1089ef',
          700: '#0d6aba',
          800: '#094c85',
          900: '#052e50',
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  darkMode: 'class',
  // plugins: [],
  // plugins: [require('@tailwindcss/typography')],
};

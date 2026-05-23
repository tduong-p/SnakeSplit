/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Lexend', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./views/**/*.{html,ejs}",
    "./views/**/**/*.{html,ejs}", // Include nested directories like admin
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

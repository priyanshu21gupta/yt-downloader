/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f0f14",
        card: "#1a1a23",
        accent: "#6366f1",
      },
    },
  },
  plugins: [],
};
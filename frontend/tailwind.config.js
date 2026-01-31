/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hacker: {
          black: "#000000",
          white: "#FFFFFF",
          gray: "#666666",
          darkGray: "#111111",
          border: "rgba(255, 255, 255, 0.2)",
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'flicker': 'flicker 0.15s infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: 0.99 },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: 0.4 },
        },
        blink: {
          'from, to': { color: 'transparent' },
          '50%': { color: 'inherit' },
        }
      },
    },
  },
  plugins: [],
}

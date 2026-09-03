/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Griffith University brand red, extended into a usable ramp.
        griffith: {
          50: '#fff1f2',
          100: '#ffe0e2',
          200: '#ffc6cb',
          300: '#ff9ba5',
          400: '#fb6170',
          500: '#f23044',
          600: '#d81028',
          700: '#b60a20',
          800: '#970c1f',
          900: '#7f1020',
          950: '#46020b',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae3',
          300: '#b0b9ca',
          400: '#8593ac',
          500: '#657493',
          600: '#505d79',
          700: '#414c63',
          800: '#384153',
          900: '#323947',
          950: '#21252e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.08)',
        lift: '0 4px 6px -1px rgb(16 24 40 / 0.06), 0 12px 24px -8px rgb(16 24 40 / 0.12)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out',
        'slide-up': 'slide-up .28s cubic-bezier(.16,1,.3,1)',
      },
    },
  },
  plugins: [],
}

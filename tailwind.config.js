/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: '#C8322C',
          50: '#F5E1E0',
          100: '#EBC2C0',
        },
        orange: {
          DEFAULT: '#E07A4A',
        },
        cream: {
          DEFAULT: '#F5ECD7',
          dim: '#B8B0A0',
        },
        night: '#0D1117',
        dark: '#161B24',
        mid: '#1F2837',
        border: '#2A3547',
        green: {
          DEFAULT: '#3DAA6A',
        },
        alert: '#E8B84B',
        phase: {
          menstrual: '#C8322C',
          follicular: '#3DAA6A',
          ovulation: '#E8B84B',
          luteal: '#7B68B8',
        },
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease forwards',
        'pulse-dot': 'pulseDot 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(1.4)' },
        },
      },
    },
  },
  plugins: [],
}

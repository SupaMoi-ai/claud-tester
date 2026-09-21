import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAF7F2',
        surface: '#FFFFFF',
        ink: '#2B2A28',
        muted: '#8A857D',
        line: '#EDE7DD',
        sage: '#B9CBB8',
        dusty: '#B7C9D9',
        sand: '#E8DCC8',
        apricot: '#F0CDB6',
        lavender: '#CFC8E0',
      },
      borderRadius: {
        card: '24px',
        chip: '999px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(43, 42, 40, 0.04), 0 8px 24px rgba(43, 42, 40, 0.06)',
        lift: '0 2px 6px rgba(43, 42, 40, 0.06), 0 16px 40px rgba(43, 42, 40, 0.10)',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        base: ['16px', '1.5'],
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
} satisfies Config;

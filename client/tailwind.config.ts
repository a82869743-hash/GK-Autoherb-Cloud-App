import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#D32F2F',
          'red-dark': '#B71C1C',
          'red-deep': '#af101a',
          'red-light': '#FFEBEE',
          'red-glow': '#FF5252',
          black: '#000000',
          charcoal: '#1a1a1a',
          sidebar: '#111111',
          cream: '#faf7f5',
          'text-primary': '#1c1b1b',
          'text-secondary': '#5f5e5e',
          'text-muted': '#8f6f6c',
          surface: '#f6f3f2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 30px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.05)',
        'card-premium': '0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06)',
        'glow-red': '0 0 20px rgba(211,47,47,0.15), 0 0 40px rgba(211,47,47,0.08)',
        'glow-red-lg': '0 0 30px rgba(211,47,47,0.25), 0 0 60px rgba(211,47,47,0.12)',
        'inner-glow': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #af101a 0%, #D32F2F 50%, #FF5252 100%)',
        'dark-gradient': 'linear-gradient(180deg, #111111 0%, #1a1a1a 100%)',
        'hero-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 40%, #111111 100%)',
        'surface-gradient': 'linear-gradient(180deg, #ffffff 0%, #faf7f5 100%)',
        'red-subtle': 'linear-gradient(135deg, rgba(211,47,47,0.03) 0%, rgba(211,47,47,0.08) 100%)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(211,47,47,0.2)' },
          '50%': { boxShadow: '0 0 0 8px rgba(211,47,47,0)' },
        },
        'shimmer-glow': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.4s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer-glow': 'shimmer-glow 2s linear infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;

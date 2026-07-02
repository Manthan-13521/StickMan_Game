import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
        secondary: { DEFAULT: '#ec4899', light: '#f472b6', dark: '#db2777' },
        accent: { DEFAULT: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
        surface: { DEFAULT: '#1e1b4b', light: '#312e81', dark: '#0f0d2e' },
        glass: { DEFAULT: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)' },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'health-pulse': 'health-pulse 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99,102,241,0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(99,102,241,0.8)' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'health-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
};

export default config;

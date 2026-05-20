/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#050505',
        'bg-secondary': '#0D0D0D',
        'bg-card': '#121212',
        'bg-glass': 'rgba(255,255,255,0.03)',
        'accent-gold': '#E8A838',
        'accent-teal': '#1ECFB0',
        'accent-purple': '#7B5EA7',
        'accent-blue': '#007AFF', // Apple Blue
        'accent-pink': '#FF2D55', // Apple Pink
        'text-primary': '#FFFFFF',
        'text-secondary': '#A1A1A6', // Apple Secondary
        'text-hint': '#6E6E73',
        'border-gold': 'rgba(232,168,56,0.15)',
        'border-white': 'rgba(255,255,255,0.1)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        ui: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '2rem', // More rounded like Apple
        pill: '9999px',
        input: '1rem',
      },
      backgroundImage: {
        'gradient-apple': 'linear-gradient(135deg, #007AFF 0%, #FF2D55 100%)',
        'gradient-cosmic': 'linear-gradient(45deg, #050505 0%, #121212 100%)',
        'gradient-premium': 'linear-gradient(135deg, rgba(232,168,56,0.8), rgba(123,94,167,0.8))',
      }
    },
  },
  plugins: [],
}

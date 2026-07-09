import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        atlas: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#64748B',
          text: '#0F172A',
          soft: '#F1F5F9',
          primary: '#111827',
          accent: '#4F46E5',
          accentSoft: '#EEF2FF',
          success: '#10B981',
          warning: '#F59E0B',
          critical: '#EF4444',
          info: '#3B82F6',
          pii: '#6366F1',
          sensitive: '#EC4899'
        }
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        subtle: '0 8px 20px rgba(15, 23, 42, 0.04)',
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 28px -12px rgba(15, 23, 42, 0.12)',
        'card-hover': '0 4px 10px rgba(15, 23, 42, 0.06), 0 20px 40px -16px rgba(15, 23, 42, 0.18)',
        glow: '0 0 0 1px rgba(79, 70, 229, 0.08), 0 8px 24px -8px rgba(79, 70, 229, 0.35)'
      },
      backgroundImage: {
        'atlas-radial': 'radial-gradient(circle at top left, rgba(79,70,229,0.12), transparent 55%)',
        'atlas-mesh': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' }
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.35)' },
          '100%': { boxShadow: '0 0 0 8px rgba(16,185,129,0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        shimmer: 'shimmer 1.6s infinite linear',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite'
      }
    }
  },
  plugins: []
};

export default config;

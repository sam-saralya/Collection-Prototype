/** @type {import('tailwindcss').Config} */
// Verbatim copy of the production client's tailwind.config.js so the prototype
// renders with the exact same design tokens. Do not diverge from the source.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        muted: '#64748b',
        line: '#e2e8f0',
        brand: { DEFAULT: '#635bff', 2: '#7c3aed' },
        mint: '#13b8a6',
        cyan: '#0891b2',
        amber: '#f59e0b',
        danger: '#e5484d',
        ok: '#16a34a',
        sidebar: '#0b1220',
        sidebar2: '#101b30',
        // score bands
        high: '#13b8a6',
        med: '#f59e0b',
        low: '#e5484d',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 18px 45px rgba(15,23,42,.08)',
        brand: '0 9px 22px rgba(99,91,255,.25)',
        pop: '0 30px 80px rgba(0,0,0,.25)',
      },
      borderRadius: { xl2: '18px', xl3: '22px' },
      keyframes: {
        'toast-in': {
          '0%': { transform: 'translateY(100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'pop-in': {
          '0%': { transform: 'scale(.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'toast-in': 'toast-in .25s ease both',
        'fade-in': 'fade-in .2s ease both',
        'pop-in': 'pop-in .18s ease both',
        'slide-in-right': 'slide-in-right .28s cubic-bezier(.22,.61,.36,1) both',
      },
    },
  },
  plugins: [],
};

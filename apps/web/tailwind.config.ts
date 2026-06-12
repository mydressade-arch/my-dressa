import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'surface':                    '#fdf8f8',
        'surface-dim':                '#ddd9d8',
        'surface-container-lowest':   '#ffffff',
        'surface-container-low':      '#f7f3f2',
        'surface-container':          '#f1edec',
        'surface-container-high':     '#ebe7e6',
        'surface-container-highest':  '#e5e2e1',
        'on-surface':                 '#1c1b1b',
        'on-surface-variant':         '#444748',
        'outline':                    '#747878',
        'outline-variant':            '#c4c7c7',
        'primary':                    '#000000',
        'on-primary':                 '#ffffff',
        'secondary':                  '#5e5e5b',
        'secondary-container':        '#e1dfdb',
        'cream-dark':                 '#E5E1D8',
        'status-rent':                '#9E896A',
        'status-sale':                '#1A1A1A',
        'emerald-deep':               '#064E3B',
        'tertiary-fixed':             '#f8dfbb',
        'on-tertiary-container':      '#958162',
        'error':                      '#ba1a1a',
        'error-container':            '#ffdad6',
      },
      fontFamily: {
        serif:      ['Playfair Display', 'Georgia', 'serif'],
        sans:       ['Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display':    ['84px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['48px', { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline':   ['32px', { lineHeight: '1.2',  fontWeight: '600' }],
        'headline-sm':['24px', { lineHeight: '1.3',  fontWeight: '600' }],
        'label-caps': ['12px', { lineHeight: '1.0',  letterSpacing: '0.1em',  fontWeight: '600' }],
        'btn':        ['14px', { lineHeight: '1.0',  letterSpacing: '0.05em', fontWeight: '600' }],
      },
      spacing: {
        'gutter':          '24px',
        'margin-desktop':  '64px',
        'margin-mobile':   '20px',
      },
      maxWidth: {
        'container': '1440px',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        'lg':    '0.5rem',
        'full':  '9999px',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up':   'fade-up 0.6s ease forwards',
        'fade-in':   'fade-in 0.4s ease forwards',
      },
    },
  },
  plugins: [],
}
export default config

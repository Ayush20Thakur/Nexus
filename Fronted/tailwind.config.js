/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // === NEXUS Surface Tokens ===
        surface: '#141313',
        'surface-dim': '#141313',
        'surface-bright': '#3a3939',
        'surface-container-lowest': '#0e0e0e',
        'surface-container-low': '#1c1b1b',
        'surface-container': '#201f1f',
        'surface-container-high': '#2b2a2a',
        'surface-container-highest': '#353434',
        'surface-variant': '#353434',
        'surface-tint': '#c8c6c7',

        // === On-Surface Tokens ===
        'on-surface': '#e5e2e1',
        'on-surface-variant': '#c6c6ca',
        'on-background': '#e5e2e1',
        background: '#141313',

        // === Inverse Tokens ===
        'inverse-surface': '#e5e2e1',
        'inverse-on-surface': '#313030',
        'inverse-primary': '#5f5e5f',

        // === Primary ===
        primary: '#e4e2e3',
        'on-primary': '#303031',
        'primary-container': '#c8c6c7',
        'on-primary-container': '#535253',
        'primary-fixed': '#e4e2e3',
        'primary-fixed-dim': '#c8c6c7',
        'on-primary-fixed': '#1b1b1c',
        'on-primary-fixed-variant': '#474748',

        // === Secondary ===
        secondary: '#c8c5c9',
        'on-secondary': '#313033',
        'secondary-container': '#474649',
        'on-secondary-container': '#b7b4b8',
        'secondary-fixed': '#e5e1e5',
        'secondary-fixed-dim': '#c8c5c9',
        'on-secondary-fixed': '#1c1b1e',
        'on-secondary-fixed-variant': '#474649',

        // === Tertiary ===
        tertiary: '#e8e1de',
        'on-tertiary': '#33302e',
        'tertiary-container': '#ccc5c2',
        'on-tertiary-container': '#56514f',
        'tertiary-fixed': '#e9e1de',
        'tertiary-fixed-dim': '#ccc5c2',
        'on-tertiary-fixed': '#1e1b19',
        'on-tertiary-fixed-variant': '#4a4644',

        // === Error ===
        error: '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',
        'error-red': '#ffb4ab',

        // === Outline ===
        outline: '#909194',
        'outline-variant': '#45474a',

        // === Semantic Colors ===
        'success-green': '#81c995',
        'warning-amber': '#fbbc04',
        'ai-accent': '#c8c6c7',
        'glass-surface': 'rgba(20, 19, 19, 0.7)',
      },
      fontFamily: {
        'mono-data': ['"JetBrains Mono"', 'monospace'],
        metadata: ['Inter', 'sans-serif'],
        'page-title': ['Inter', 'sans-serif'],
        'section-title': ['Inter', 'sans-serif'],
        'card-title': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'label-caps': ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'mono-data': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        metadata: ['10px', { lineHeight: '14px', fontWeight: '500' }],
        'page-title': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'section-title': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'card-title': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label-caps': ['10px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '700' }],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      spacing: {
        unit: '4px',
        'stack-gap': '12px',
        'element-padding-sm': '8px',
        'element-padding-md': '16px',
        'section-gap': '32px',
        'container-margin': '20px',
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(228,226,227,0.15)' },
          '50%': { boxShadow: '0 0 20px rgba(228,226,227,0.35)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-lg': '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glow-primary': '0 0 15px rgba(228,226,227,0.15)',
        'glow-success': '0 0 8px rgba(129,201,149,0.4)',
        'glow-error': '0 0 8px rgba(255,180,171,0.4)',
      },
    },
  },
  plugins: [],
}

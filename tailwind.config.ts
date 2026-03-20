import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans:     ['Inter', 'ui-sans-serif', 'system-ui'],
				headline: ['Inter', 'ui-sans-serif'],
				body:     ['Inter', 'ui-sans-serif'],
				label:    ['Inter', 'ui-sans-serif'],
			},
			colors: {
				/* ── shadcn/ui design tokens (HSL CSS vars) ─────────────────── */
				border:      'hsl(var(--border))',
				input:       'hsl(var(--input))',
				ring:        'hsl(var(--ring))',
				background:  'hsl(var(--background))',
				foreground:  'hsl(var(--foreground))',
				primary: {
					DEFAULT:    'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT:    'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT:    'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT:    'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT:    'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT:    'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT:    'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT:              'hsl(var(--sidebar-background))',
					foreground:           'hsl(var(--sidebar-foreground))',
					primary:              'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent:               'hsl(var(--sidebar-accent))',
					'accent-foreground':  'hsl(var(--sidebar-accent-foreground))',
					border:               'hsl(var(--sidebar-border))',
					ring:                 'hsl(var(--sidebar-ring))'
				},

				/* ── Aether Canvas supplementary tokens (direct hex) ─────────
				 * Used in components that reference Aether design language:
				 * glass-card, bento grid, surface containers, badges, rings.
				 * These don't override shadcn vars — they extend the palette. */
				'surface-bright':           '#f8f9fa',
				'surface-container':        '#ebeef0',
				'surface-container-low':    '#f1f4f5',
				'surface-container-high':   '#e5e9eb',
				'surface-container-highest':'#dee3e6',
				'surface-container-lowest': '#ffffff',
				'surface-dim':              '#d5dbdd',
				'surface-variant':          '#dee3e6',
				'on-surface':               '#2d3335',
				'on-surface-variant':       '#5a6062',
				'outline-variant':          '#adb3b5',
				'outline':                  '#767c7e',

				/* Primary shades */
				'primary-fixed':            '#b2b2fb',
				'primary-fixed-dim':        '#a4a4ec',
				'primary-container':        '#b2b2fb',
				'on-primary-container':     '#2f2f6f',
				'on-primary-fixed':         '#181657',
				'on-primary-fixed-variant': '#383878',
				'primary-dim':              '#4c4c8d',
				'inverse-primary':          '#b2b2fb',

				/* Secondary shades */
				'secondary-container':      '#c3eaea',
				'on-secondary-container':   '#345858',
				'secondary-fixed':          '#c3eaea',
				'secondary-fixed-dim':      '#b6dcdc',
				'on-secondary-fixed':       '#214545',
				'on-secondary-fixed-variant':'#3e6262',
				'secondary-dim':            '#355959',

				/* Tertiary shades */
				'tertiary':                 '#6c5d3f',
				'tertiary-container':       '#fde9c1',
				'tertiary-fixed':           '#fde9c1',
				'tertiary-fixed-dim':       '#eedbb4',
				'on-tertiary':              '#fff8f0',
				'on-tertiary-container':    '#635537',
				'on-tertiary-fixed':        '#504326',
				'on-tertiary-fixed-variant':'#6d5f40',
				'tertiary-dim':             '#5f5234',

				/* Error shades */
				'error-container':          '#f97386',
				'on-error-container':       '#6e0523',
				'on-error':                 '#fff7f7',
				'error-dim':                '#6b0221',

				/* Surface tint */
				'surface-tint':             '#58589a',

				/* Inverse */
				'inverse-surface':          '#0c0f10',
				'inverse-on-surface':       '#9b9d9e',
			},
			borderRadius: {
				lg:   'var(--radius)',
				md:   'calc(var(--radius) - 2px)',
				sm:   'calc(var(--radius) - 4px)',
				xl:   'calc(var(--radius) + 4px)',
				'2xl':'calc(var(--radius) + 8px)',
				full: '9999px',
			},
			boxShadow: {
				'glass':   '0 4px 24px -1px rgba(88,88,154,0.08), 0 2px 8px -1px rgba(88,88,154,0.05)',
				'glass-lg':'0 8px 40px -2px rgba(88,88,154,0.14), 0 4px 16px -2px rgba(88,88,154,0.08)',
				'primary': '0 8px 30px rgba(88,88,154,0.25)',
				'primary-lg':'0 8px 40px rgba(88,88,154,0.40)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to:   { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to:   { height: '0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up':   'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;

import { Platform } from 'react-native';

// ─── Paleta ────────────────────────────────────────────────────────────────
export const COLORS = {
  // Fondos
  background:   '#F0F4FF',
  surface:      '#FFFFFF',
  surfaceSoft:  '#F8FAFF',
  surfaceBlue:  '#EEF2FF',

  // Texto
  text:         '#0D1B3E',
  subtitle:     '#3D5A99',
  muted:        '#8B9DC3',

  // Bordes
  border:       '#E4EAF8',

  // Acento principal — azul profundo
  accent:       '#1A3FBB',
  accentMid:    '#2E59D9',
  accentSoft:   '#D6E0FF',
  onAccent:     '#FFFFFF',

  // Gradiente header (valores para LinearGradient)
  gradientStart: '#1A3FBB',
  gradientEnd:   '#2E59D9',

  // Estados
  success:      '#0CAF60',
  successSoft:  '#D1FAE5',
  warning:      '#F59E0B',
  warningSoft:  '#FEF3C7',
  danger:       '#E53E3E',
  dangerSoft:   '#FEE2E2',
  info:         '#0EA5E9',

  // Tab bar
  tabActive:    '#1A3FBB',
  tabInactive:  '#8B9DC3',
  tabBg:        '#FFFFFF',
};

// ─── Sombras ───────────────────────────────────────────────────────────────
export const SHADOW = {
  card: {
    shadowColor:   '#1A3FBB',
    shadowOpacity: 0.10,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 8 },
    elevation:     6,
  },
  strong: {
    shadowColor:   '#1A3FBB',
    shadowOpacity: 0.22,
    shadowRadius:  28,
    shadowOffset:  { width: 0, height: 12 },
    elevation:     12,
  },
  subtle: {
    shadowColor:   '#1A3FBB',
    shadowOpacity: 0.05,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     2,
  },
};

// ─── Tipografía ────────────────────────────────────────────────────────────
export const TYPO = {
  hero:     { fontSize: 32, fontWeight: '900' as const, color: COLORS.text, letterSpacing: -0.5 },
  h1:       { fontSize: 24, fontWeight: '800' as const, color: COLORS.text, letterSpacing: -0.3 },
  h2:       { fontSize: 18, fontWeight: '700' as const, color: COLORS.text },
  h3:       { fontSize: 15, fontWeight: '700' as const, color: COLORS.text },
  body:     { fontSize: 14, fontWeight: '400' as const, color: COLORS.subtitle },
  caption:  { fontSize: 11, fontWeight: '600' as const, color: COLORS.muted, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  number:   { fontSize: 28, fontWeight: '900' as const, color: COLORS.text, letterSpacing: -1 },
};

// ─── Radios ────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  full: 999,
};

// ─── Espaciado ─────────────────────────────────────────────────────────────
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};  
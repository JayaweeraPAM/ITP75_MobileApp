// macOS-inspired premium glassmorphism theme
export const Colors = {
  // Core palette
  black: '#000000',
  background: '#000000', // True Black for maximum depth
  primary: '#FFFFFF', // Minimalist primary (White)
  accent: '#6366F1', // Indigo accent for subtle brand flair

  // Glass System (iOS-style frosted surfaces)
  glass: 'rgba(18, 22, 34, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  glassHover: 'rgba(36, 42, 62, 0.82)',
  glassCard: 'rgba(22, 27, 40, 0.76)',

  // Blur Intensities
  blurSm: 10,
  blurMd: 25,
  blurLg: 40,
  blurPremium: 10,

  // Premium Glassmorphism
  glassBackground: 'rgba(6, 4, 15, 0.55)',

  // Text Selection
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.70)',
  textMuted: 'rgba(255, 255, 255, 0.45)',

  // Inputs
  inputBg: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.10)',

  // Shadows
  shadowSoft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },

  // Expo template compatibility (used by some optional components)
  light: {
    text: '#0B0B0F',
    background: '#FFFFFF',
    tint: '#6366F1',
    icon: '#4B5563',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#6366F1',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    tint: '#A5A1FF',
    icon: 'rgba(180,175,255,0.55)',
    tabIconDefault: 'rgba(180,175,255,0.38)',
    tabIconSelected: '#A5A1FF',
  },
};

export const BorderRadius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  full: 100,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};


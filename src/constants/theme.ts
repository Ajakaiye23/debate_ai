// Neon Dusk theme — deep violet base, hot pink primary, soft blue as accent.

export const colors = {
  // Backgrounds (violet/purple)
  bg: {
    void: '#0E0016', // deepest background
    base: '#160022', // screen background
    surface: '#1F0030', // cards, panels
    elevated: '#2A0040', // topbar, modals
  },

  // Accents
  pink: '#FF5EE0', // PRIMARY — CTAs, mic, selected state, primary borders
  pinkPressed: '#CC44B0',
  sky: '#85C2FF', // SECONDARY accent — scores, info, timer fill
  gold: '#FFD700', // winner highlight
  coral: '#FF6B8A', // danger — timer warning, errors

  // Text (violet-tinted)
  text: {
    primary: '#F0DDFF', // headings, primary labels
    secondary: '#A878CC', // muted labels, subtitles
    disabled: '#5A3A7A', // placeholder, inactive
  },

  // Semantic
  win: '#44FF88', // round-winner badge

  // Hairline borders (with alpha)
  border: {
    pink: 'rgba(255, 94, 224, 0.22)', // standard card/CTA border
    sky: 'rgba(133, 194, 255, 0.20)', // accent border
    win: 'rgba(68, 255, 136, 0.30)',
  },

  // Background glow colors (for the dusk backdrop)
  glow: {
    pink: '#FF5EE0',
    violet: '#7A3DFF',
    blue: '#4D7CFF',
  },
} as const;

export const fonts = {
  display: 'Outfit_700Bold',
  heading: 'Outfit_600SemiBold',
  body: 'Outfit_400Regular',
  mono: 'SpaceMono_400Regular',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

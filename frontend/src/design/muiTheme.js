import { createTheme } from '@mui/material/styles';

// MUI theme factory for the "MUI" design system. It reads the SAME
// light/dark mode + palette selection that the Classic design already exposes
// (the data-theme / data-palette toggles in App.jsx), so switching design never
// desyncs the brand colors. Every hex here is lifted verbatim from index.css so
// the two designs share one source of truth for the brand identity.

// brand = primary, brand2 = secondary, ink = a darker primary for text-on-tint.
const PALETTE_COLORS = {
  violet: {
    light: { brand: '#7c3aed', brand2: '#d97706', ink: '#6d28d9' },
    dark: { brand: '#a78bfa', brand2: '#fbbf24', ink: '#c4b5fd' },
  },
  teal: {
    light: { brand: '#0d9488', brand2: '#2563eb', ink: '#0f766e' },
    dark: { brand: '#2dd4bf', brand2: '#60a5fa', ink: '#5eead4' },
  },
  rose: {
    light: { brand: '#e11d48', brand2: '#ca8a04', ink: '#be123c' },
    dark: { brand: '#fb7185', brand2: '#fbbf24', ink: '#fda4af' },
  },
  emerald: {
    light: { brand: '#059669', brand2: '#0284c7', ink: '#047857' },
    dark: { brand: '#34d399', brand2: '#38bdf8', ink: '#6ee7b7' },
  },
};

// Neutral tokens per mode (mirrors index.css :root and :root[data-theme=dark]).
const NEUTRALS = {
  light: {
    fg: '#18151f',
    muted: '#6b6478',
    border: '#e6e1ef',
    surface: '#ffffff',
    // A solid stand-in for the Classic body gradient (MUI wants a flat default).
    bg: '#f6f2fa',
  },
  dark: {
    fg: '#ece8f3',
    muted: '#9a92a8',
    border: '#2d2836',
    surface: '#1d1926',
    bg: '#0d0b12',
  },
};

export function buildMuiTheme(mode = 'light', palette = 'violet') {
  const m = mode === 'dark' ? 'dark' : 'light';
  const colors = (PALETTE_COLORS[palette] || PALETTE_COLORS.violet)[m];
  const n = NEUTRALS[m];

  return createTheme({
    palette: {
      mode: m,
      primary: { main: colors.brand, dark: colors.ink, contrastText: '#ffffff' },
      secondary: { main: colors.brand2, contrastText: '#ffffff' },
      background: { default: n.bg, paper: n.surface },
      text: { primary: n.fg, secondary: n.muted },
      divider: n.border,
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      h1: { fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      // Material elevation (shadows), NOT the flat bordered look of Classic —
      // this is a deliberate visual differentiator between the two designs.
      MuiCard: {
        defaultProps: { elevation: 3 },
        styleOverrides: { root: { borderRadius: 16 } },
      },
      MuiPaper: {
        styleOverrides: { rounded: { borderRadius: 16 } },
      },
      MuiButton: {
        defaultProps: { variant: 'contained', disableElevation: false },
        styleOverrides: { root: { borderRadius: 10, paddingInline: 18 } },
      },
      MuiAppBar: {
        defaultProps: { color: 'default', elevation: 1 },
        styleOverrides: {
          root: { backgroundColor: n.surface, color: n.fg },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 700 } },
      },
    },
  });
}

// Brand gradient string per palette/mode, reused by the AppBar brand mark so it
// matches the Classic .brand-mark gradient.
export function brandGradient(mode = 'light', palette = 'violet') {
  const m = mode === 'dark' ? 'dark' : 'light';
  const c = (PALETTE_COLORS[palette] || PALETTE_COLORS.violet)[m];
  return `linear-gradient(135deg, ${c.brand} 0%, ${c.brand2} 100%)`;
}

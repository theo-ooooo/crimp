// tokens.jsx — Crimp design tokens (Toss-inspired)
// Two brand variations (blue / orange) × two themes (light / dark)

const CrimpTokens = {
  // Accent color families — single point color, no gradients
  accents: {
    blue:   { base: '#3182F6', soft: '#E8F2FE', ink: '#1B64DA', flash: '#5B9BFF' },
    orange: { base: '#FF6B35', soft: '#FFEDE5', ink: '#E5521C', flash: '#FF8A5C' },
  },
  // Neutral scales
  light: {
    bg:       '#FFFFFF',
    subtle:   '#F5F7FA',
    subtle2:  '#EEF1F5',
    hairline: '#E5E8EB',
    text:     '#0F1419',
    text2:    '#4E5968',
    text3:    '#8B95A1',
    text4:    '#B0B8C1',
    chip:     '#F2F4F6',
    shadow:   '0 1px 2px rgba(15,20,25,0.04), 0 2px 8px rgba(15,20,25,0.04)',
    shadowSm: '0 4px 16px rgba(15,20,25,0.08)',
    shadowLg: '0 20px 60px rgba(15,20,25,0.18)',
  },
  dark: {
    bg:       '#0D0F12',
    subtle:   '#17191C',
    subtle2:  '#1E2125',
    hairline: '#2A2E33',
    text:     '#F7F8F9',
    text2:    '#B0B8C1',
    text3:    '#8B95A1',
    text4:    '#5A6470',
    chip:     '#1E2125',
    shadow:   '0 1px 2px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
    shadowSm: '0 4px 16px rgba(0,0,0,0.3)',
    shadowLg: '0 20px 60px rgba(0,0,0,0.6)',
  },
  semantic: {
    success: '#12B886',
    warning: '#FAB005',
    danger:  '#E03131',
  },
  // V-scale grade stops — light blue → deep charcoal
  gradeStops: [
    { v: 'V0', hue: 208, l: 92 },
    { v: 'V1', hue: 208, l: 85 },
    { v: 'V2', hue: 210, l: 72 },
    { v: 'V3', hue: 212, l: 58 },
    { v: 'V4', hue: 214, l: 45 },
    { v: 'V5', hue: 216, l: 36 },
    { v: 'V6', hue: 218, l: 28 },
    { v: 'V7', hue: 220, l: 22 },
    { v: 'V8', hue: 222, l: 18 },
    { v: 'V9', hue: 224, l: 14 },
    { v: 'V10',hue: 226, l: 11 },
  ],
  // Hold colors
  holdColors: {
    red: '#E03131', blue: '#1C7ED6', yellow: '#F59F00', green: '#2F9E44',
    white: '#F8F9FA', black: '#212529', pink: '#E64980', orange: '#F76707',
    purple: '#7048E8', gray: '#868E96',
  },
  font: {
    family: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
    mono:   'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
  },
};

// Grade badge helper — returns {bg, fg}
function gradeTint(v) {
  const stop = CrimpTokens.gradeStops.find(g => g.v === v) || CrimpTokens.gradeStops[0];
  const bg = `oklch(${stop.l}% 0.06 ${stop.hue})`;
  const fg = stop.l > 50 ? '#0F1419' : '#FFFFFF';
  return { bg, fg };
}

// Resolve theme + accent → flat token bag
function resolveTokens(theme = 'light', accent = 'blue') {
  return {
    ...CrimpTokens[theme],
    accent: CrimpTokens.accents[accent],
    semantic: CrimpTokens.semantic,
    holds: CrimpTokens.holdColors,
    font: CrimpTokens.font,
    theme,
  };
}

Object.assign(window, { CrimpTokens, gradeTint, resolveTokens });

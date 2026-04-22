// primitives.jsx — Shared Crimp primitives (icons, chips, badges, buttons)

// Hairline thin outline icons (2px, currentColor)
const CrimpIcon = {
  bell: (p) => <svg width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
  search: (p) => <svg width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  plus: (p) => <svg width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  chevR: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m8 5 5 5-5 5"/></svg>,
  chevL: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m12 5-5 5 5 5"/></svg>,
  close: (p) => <svg width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  home: (p) => <svg width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill={p.fill?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 10 12 3l8 7v10a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>,
  map: (p) => <svg width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill={p.fill?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14" strokeWidth="1.5"/></svg>,
  feed: (p) => <svg width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill={p.fill?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg>,
  profile: (p) => <svg width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill={p.fill?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
  clock: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v4l3 2"/></svg>,
  pin: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 18s6-5.5 6-10a6 6 0 0 0-12 0c0 4.5 6 10 6 10z"/><circle cx="10" cy="8" r="2"/></svg>,
  play: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="currentColor"><path d="M5 3.5v13a1 1 0 0 0 1.5.87L17 10.87a1 1 0 0 0 0-1.74L6.5 2.63A1 1 0 0 0 5 3.5Z"/></svg>,
  flame: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M10 18c3.3 0 6-2.5 6-5.5 0-2.5-1.5-4-3-5 0 2-2 3-3 3s-1-2 0-4c-3 2-6 4-6 7.5 0 3 2.7 4 6 4z"/></svg>,
  check: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 10 4 4 8-9"/></svg>,
  filter: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5h14M5 10h10M8 15h4"/></svg>,
  trend: (p) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m2 10 4-4 3 3 5-5"/><path d="M10 4h4v4"/></svg>,
  dots: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="1.8"/><circle cx="10" cy="10" r="1.8"/><circle cx="16" cy="10" r="1.8"/></svg>,
  target: (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="3.5"/><circle cx="10" cy="10" r="0.5" fill="currentColor"/></svg>,
};

// Result glyphs — icon+color, not color alone
const ResultMark = ({ kind, size = 22, tokens }) => {
  const map = {
    SEND:    { bg: tokens.accent.base, fg: '#fff', glyph: <path d="m4 9 3 3 7-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/> },
    FLASH:   { bg: '#FAB005', fg: '#1A1200', glyph: <path d="M11 2 4 11h4l-1 7 7-9h-4l1-7z" fill="currentColor"/> },
    ONSIGHT: { bg: '#12B886', fg: '#fff', glyph: <g fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="5"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/></g> },
    TRY:     { bg: tokens.subtle2, fg: tokens.text2, glyph: <path d="M9 3v7l4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/> },
    FAIL:    { bg: tokens.subtle2, fg: tokens.text3, glyph: <path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/> },
  };
  const m = map[kind] || map.TRY;
  return (
    <div style={{
      width: size, height: size, borderRadius: size/2, background: m.bg, color: m.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width={size*0.72} height={size*0.72} viewBox="0 0 18 18">{m.glyph}</svg>
    </div>
  );
};

// V-grade badge — continuous gradient by difficulty
const GradeBadge = ({ v, size = 'md', tokens }) => {
  const sz = size === 'sm' ? { w: 36, h: 22, fs: 12 } : size === 'lg' ? { w: 56, h: 34, fs: 18 } : { w: 44, h: 26, fs: 14 };
  const t = gradeTint(v);
  return (
    <div style={{
      width: sz.w, height: sz.h, borderRadius: sz.h/2,
      background: t.bg, color: t.fg,
      fontSize: sz.fs, fontWeight: 800, letterSpacing: '-0.02em',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontVariantNumeric: 'tabular-nums',
    }}>{v}</div>
  );
};

// Pill chip
const Chip = ({ children, active, onClick, tokens, icon }) => (
  <button onClick={onClick} style={{
    height: 36, padding: '0 14px', borderRadius: 18, border: 'none',
    background: active ? tokens.text : tokens.chip,
    color: active ? tokens.bg : tokens.text2,
    fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'inherit',
    transition: 'background .15s, color .15s',
  }}>{icon}{children}</button>
);

// Hold-color dot
const HoldDot = ({ color, size = 14, tokens }) => {
  const c = tokens.holds[color] || color;
  return <span style={{
    width: size, height: size, borderRadius: size/2, background: c,
    display: 'inline-block', flexShrink: 0,
    boxShadow: color === 'white' ? `inset 0 0 0 1px ${tokens.hairline}` : 'none',
  }}/>;
};

// Primary button
const PrimaryButton = ({ children, onClick, tokens, disabled, style }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: '100%', height: 56, borderRadius: 16, border: 'none',
    background: disabled ? tokens.subtle2 : tokens.accent.base,
    color: disabled ? tokens.text3 : '#fff',
    fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    transition: 'transform .15s cubic-bezier(.2,.8,.2,1), background .15s',
    ...style,
  }}
  onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'scale(0.98)')}
  onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
  >{children}</button>
);

// Secondary flat button
const SecondaryButton = ({ children, onClick, tokens, style }) => (
  <button onClick={onClick} style={{
    width: '100%', height: 56, borderRadius: 16, border: 'none',
    background: tokens.subtle, color: tokens.text,
    fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em',
    cursor: 'pointer', fontFamily: 'inherit',
    ...style,
  }}>{children}</button>
);

// Stat — big number + label
const BigStat = ({ value, label, unit, tokens, scale = 'md', align = 'left', accent }) => {
  const scales = {
    sm: { num: 32, lbl: 13 },
    md: { num: 48, lbl: 13 },
    lg: { num: 72, lbl: 14 },
    xl: { num: 96, lbl: 15 },
    hero: { num: 140, lbl: 16 },
  };
  const s = scales[scale];
  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize: s.lbl, color: tokens.text3, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: s.num, fontWeight: 800, color: accent || tokens.text,
        letterSpacing: '-0.05em', lineHeight: 0.95, fontVariantNumeric: 'tabular-nums',
        display: 'flex', alignItems: 'baseline', gap: 2,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
      }}>
        {value}
        {unit && <span style={{ fontSize: s.num * 0.4, fontWeight: 700, color: tokens.text3, marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  );
};

// Skeleton shimmer
const Skeleton = ({ w, h, r = 8, tokens }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg, ${tokens.subtle} 0%, ${tokens.subtle2} 50%, ${tokens.subtle} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'crimp-shimmer 1.4s ease-in-out infinite',
  }}/>
);

// Bottom tab bar
const BottomTabs = ({ active = 'home', tokens, onNav }) => {
  const items = [
    { k: 'home', icon: CrimpIcon.home, label: '홈' },
    { k: 'map', icon: CrimpIcon.map, label: '암장' },
    { k: 'feed', icon: CrimpIcon.feed, label: '피드' },
    { k: 'me', icon: CrimpIcon.profile, label: '나' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingTop: 8, paddingBottom: 28,
      background: tokens.bg,
      borderTop: `0.5px solid ${tokens.hairline}`,
      display: 'flex', justifyContent: 'space-around',
      zIndex: 20,
    }}>
      {items.map(it => {
        const on = active === it.k;
        return (
          <button key={it.k} onClick={() => onNav && onNav(it.k)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: on ? tokens.text : tokens.text4,
            fontFamily: 'inherit', padding: '4px 16px',
          }}>
            <it.icon s={26} fill={on}/>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '-0.01em' }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
};

Object.assign(window, {
  CrimpIcon, ResultMark, GradeBadge, Chip, HoldDot,
  PrimaryButton, SecondaryButton, BigStat, Skeleton, BottomTabs,
});

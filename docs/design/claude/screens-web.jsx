// screens-web.jsx — Crimp web dashboard (responsive, Toss-style)

const WebFrame = ({ children, tokens }) => (
  <div style={{
    width: 1180, height: 820, borderRadius: 16, overflow: 'hidden',
    background: tokens.bg, color: tokens.text,
    fontFamily: tokens.font.family,
    boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 40px 80px rgba(15,20,25,0.12)',
    display: 'flex', flexDirection: 'column',
  }}>
    {/* browser chrome */}
    <div style={{
      height: 40, background: tokens.subtle, borderBottom: `1px solid ${tokens.hairline}`,
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
    }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {['#FF5F56','#FFBD2E','#27C93F'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: 6, background: c }}/>)}
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: '4px 14px', background: tokens.bg, borderRadius: 6,
          fontSize: 12, color: tokens.text3, fontWeight: 500, letterSpacing: '-0.01em' }}>
          crimp.app
        </div>
      </div>
    </div>
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>{children}</div>
  </div>
);

const WebSidebar = ({ tokens, active = 'home' }) => {
  const items = [
    { k: 'home', label: '홈', icon: CrimpIcon.home },
    { k: 'sessions', label: '내 세션', icon: CrimpIcon.clock },
    { k: 'gyms', label: '암장', icon: CrimpIcon.map },
    { k: 'feed', label: '피드', icon: CrimpIcon.feed },
    { k: 'me', label: '프로필', icon: CrimpIcon.profile },
  ];
  return (
    <div style={{
      width: 240, borderRight: `1px solid ${tokens.hairline}`,
      padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 4,
      background: tokens.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 24px' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: tokens.accent.base,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          fontWeight: 800, fontSize: 16, letterSpacing: '-0.04em' }}>C</div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>Crimp</div>
      </div>
      {items.map(it => {
        const on = active === it.k;
        return (
          <div key={it.k} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
            background: on ? tokens.subtle : 'transparent', color: on ? tokens.text : tokens.text2,
            fontSize: 14, fontWeight: on ? 700 : 500, letterSpacing: '-0.01em', cursor: 'pointer',
          }}>
            <it.icon s={18} fill={on}/>
            {it.label}
          </div>
        );
      })}
      <div style={{ flex: 1 }}/>
      <button style={{
        margin: '0 4px', padding: '12px 14px', borderRadius: 12, border: 'none',
        background: tokens.accent.base, color: '#fff',
        fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <CrimpIcon.play s={14}/> 세션 시작
      </button>
    </div>
  );
};

const WebDashboard = ({ tokens, variant = 'restrained' }) => {
  const bold = variant === 'bold';
  return (
    <>
      <WebSidebar tokens={tokens} active="home"/>
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginBottom: 4 }}>4월 22일 화요일</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>안녕 민준 👋</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: tokens.subtle,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.text2 }}>
              <CrimpIcon.search s={18}/>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: tokens.subtle,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.text2, position: 'relative' }}>
              <CrimpIcon.bell s={18}/>
              <div style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, background: tokens.accent.base, border: `2px solid ${tokens.subtle}` }}/>
            </div>
          </div>
        </div>

        {/* Hero stats — 3 tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ padding: bold ? '32px 32px' : '24px 28px', background: tokens.subtle, borderRadius: 20 }}>
            <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginBottom: bold ? 12 : 8 }}>이번 주 완등</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <div style={{ fontSize: bold ? 120 : 72, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 0.9,
                color: tokens.text, fontVariantNumeric: 'tabular-nums' }}>14</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: tokens.semantic.success, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CrimpIcon.trend s={14}/> +40%
              </div>
            </div>
            <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 500, marginTop: 10 }}>지난주 10회 → 이번주 14회</div>
          </div>
          <div style={{ padding: '24px 24px', background: tokens.subtle, borderRadius: 20 }}>
            <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginBottom: 10 }}>세션</div>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>3회</div>
            <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 500, marginTop: 6 }}>총 5시간 38분</div>
          </div>
          <div style={{ padding: '24px 24px', background: tokens.subtle, borderRadius: 20 }}>
            <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginBottom: 10 }}>최고 그레이드</div>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.95, color: tokens.accent.base }}>V6</div>
            <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 500, marginTop: 6 }}>4월 20일 달성</div>
          </div>
        </div>

        {/* 12-week chart + recent */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <div style={{ padding: '24px 28px', background: tokens.bg, border: `1px solid ${tokens.hairline}`, borderRadius: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>12주 완등 추이</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['12주','6월','1년'].map((t, i) => (
                  <div key={t} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: i === 0 ? tokens.text : 'transparent',
                    color: i === 0 ? tokens.bg : tokens.text3 }}>{t}</div>
                ))}
              </div>
            </div>
            <BarChart tokens={tokens}/>
          </div>
          <div style={{ padding: '20px 22px', background: tokens.bg, border: `1px solid ${tokens.hairline}`, borderRadius: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>최근 세션</div>
            {[
              { n: '서울볼더스 성수', t: '2일 전', v: 'V5', c: 3 },
              { n: '더클라임 홍대', t: '5일 전', v: 'V4', c: 5 },
              { n: '락트리 합정', t: '1주 전', v: 'V6', c: 6 },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
                borderBottom: i < 2 ? `1px solid ${tokens.hairline}` : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: tokens.text3, marginTop: 2, fontWeight: 500 }}>{s.t} · 완등 {s.c}회</div>
                </div>
                <GradeBadge v={s.v} size="sm" tokens={tokens}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const BarChart = ({ tokens }) => {
  const data = [4, 7, 5, 9, 6, 11, 8, 12, 9, 14, 11, 14];
  const labels = ['W9','','W11','','W13','','W15','','W17','','W19','W20'];
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, paddingTop: 8 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: '100%', height: 148, display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
              {isLast && (
                <div style={{
                  position: 'absolute', bottom: `${(d/max)*100}%`, left: '50%', transform: 'translate(-50%, -8px)',
                  padding: '4px 8px', background: tokens.text, color: tokens.bg, borderRadius: 6,
                  fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                }}>14회</div>
              )}
              <div style={{
                width: '100%', height: `${(d/max)*100}%`,
                background: isLast ? tokens.accent.base : tokens.subtle2,
                borderRadius: 6,
              }}/>
            </div>
            <div style={{ fontSize: 10, color: tokens.text3, fontWeight: 600 }}>{labels[i]}</div>
          </div>
        );
      })}
    </div>
  );
};

Object.assign(window, { WebFrame, WebSidebar, WebDashboard, BarChart });

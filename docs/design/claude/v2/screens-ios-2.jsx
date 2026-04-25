// screens-ios-2.jsx — Crimp iOS additional screens

// ─────────────────────────────────────────────────────────────
// LOGIN — minimal Toss-style entry
// ─────────────────────────────────────────────────────────────
const LoginScreen = ({ tokens }) => (
  <div style={{ position: 'absolute', inset: 0, background: tokens.bg, overflow: 'hidden' }}>
    <div style={{ paddingTop: 120, paddingBottom: 60, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ padding: '0 24px' }}>
        <svg width="180" height="106" viewBox="0 0 380 220" style={{ marginBottom: 32, display: 'block' }}>
          <polygon points="50,180 30,120 70,40 160,20 250,30 320,80 350,150 320,200 200,210 110,200" fill={tokens.text}/>
          <text x="190" y="130" textAnchor="middle" fontFamily='"Pretendard Variable", system-ui'
                fontWeight="900" fontSize="58" letterSpacing="-0.06em" fill={tokens.bg}>climp</text>
        </svg>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.2 }}>
          더 잘 붙기 위한<br/>가장 정확한 기록
        </div>
        <div style={{ fontSize: 15, color: tokens.text3, fontWeight: 500, marginTop: 12, lineHeight: 1.5 }}>
          한 번의 시도도 놓치지 않아요.<br/>그레이드, 홀드, 시간 모두.
        </div>
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={{ width: '100%', height: 56, borderRadius: 16, border: 'none',
          background: '#FEE500', color: '#000',
          fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="#000"><ellipse cx="9" cy="8" rx="7.5" ry="6.5" fill="#000"/></svg>
          카카오로 시작하기
        </button>
        <button style={{ width: '100%', height: 56, borderRadius: 16, border: 'none',
          background: '#000', color: '#fff',
          fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          
          Apple로 계속하기
        </button>
        <button style={{ width: '100%', height: 56, borderRadius: 16, border: `1px solid ${tokens.hairline}`,
          background: tokens.bg, color: tokens.text,
          fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', cursor: 'pointer', fontFamily: 'inherit' }}>
          이메일로 가입
        </button>
        <div style={{ fontSize: 12, color: tokens.text3, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          시작하면 <span style={{ color: tokens.text2, fontWeight: 600 }}>이용약관</span> 과 <span style={{ color: tokens.text2, fontWeight: 600 }}>개인정보처리방침</span> 에 동의해요
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// MY SESSIONS — list grouped by month
// ─────────────────────────────────────────────────────────────
const MySessionsScreen = ({ tokens, variant = 'restrained' }) => {
  const bold = variant === 'bold';
  const sessions = [
    { mo: '4월', ses: [
      { d: '4월 22일', day: '화', g: '서울볼더스 성수', dur: '1:23', send: 5, top: 'V5', flag: 'live' },
      { d: '4월 20일', day: '일', g: '더클라임 홍대', dur: '1:45', send: 5, top: 'V4' },
      { d: '4월 17일', day: '목', g: '락트리 합정', dur: '2:30', send: 6, top: 'V6', star: true },
    ]},
    { mo: '3월', ses: [
      { d: '3월 30일', day: '일', g: '볼더원 강남', dur: '2:08', send: 4, top: 'V5' },
      { d: '3월 24일', day: '월', g: '서울볼더스 성수', dur: '1:52', send: 3, top: 'V4' },
      { d: '3월 18일', day: '화', g: '더클라임 홍대', dur: '2:14', send: 7, top: 'V5' },
      { d: '3월 11일', day: '화', g: '락트리 합정', dur: '1:38', send: 4, top: 'V4' },
    ]},
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, background: tokens.bg, overflow: 'hidden' }}>
      <div style={{ paddingTop: 64, paddingBottom: 110, height: '100%', overflowY: 'auto' }}>
        <div style={{ padding: '24px 20px 12px' }}>
          <div style={{ fontSize: bold ? 40 : 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            내 세션
          </div>
          {/* summary strip */}
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <div style={{ flex: 1, padding: '14px 14px', background: tokens.subtle, borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: tokens.text3, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>총 세션</div>
              <div style={{ fontSize: bold ? 28 : 22, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>47</div>
            </div>
            <div style={{ flex: 1, padding: '14px 14px', background: tokens.subtle, borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: tokens.text3, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>완등</div>
              <div style={{ fontSize: bold ? 28 : 22, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: tokens.accent.base }}>184</div>
            </div>
            <div style={{ flex: 1, padding: '14px 14px', background: tokens.subtle, borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: tokens.text3, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>최고</div>
              <div style={{ fontSize: bold ? 28 : 22, fontWeight: 800, letterSpacing: '-0.03em' }}>V6</div>
            </div>
          </div>
          {/* filter chips */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16, overflowX: 'auto' }}>
            <Chip tokens={tokens} active>전체</Chip>
            <Chip tokens={tokens}>성수</Chip>
            <Chip tokens={tokens}>홍대</Chip>
            <Chip tokens={tokens}>합정</Chip>
            <Chip tokens={tokens}>강남</Chip>
          </div>
        </div>

        {sessions.map((g, gi) => (
          <div key={gi}>
            <div style={{ padding: '16px 20px 8px', fontSize: 13, color: tokens.text3, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {g.mo}
            </div>
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {g.ses.map((s, si) => (
                <div key={si} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 14px',
                  background: tokens.bg, border: `1px solid ${tokens.hairline}`, borderRadius: 16,
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: s.flag === 'live' ? tokens.accent.soft : tokens.subtle,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: s.flag === 'live' ? tokens.accent.ink : tokens.text2,
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', opacity: 0.7 }}>{s.day}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                      {s.d.replace(/\D/g, '').slice(-2).replace(/^0/, '')}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.g}</div>
                      {s.star && <span style={{ color: tokens.semantic.warning }}>★</span>}
                      {s.flag === 'live' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6,
                          background: tokens.accent.base, color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.04em' }}>
                          <div style={{ width: 5, height: 5, borderRadius: 3, background: '#fff', animation: 'crimp-pulse 1.6s ease-in-out infinite' }}/>
                          LIVE
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: tokens.text3, marginTop: 2, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                      {s.dur} · 완등 {s.send}회
                    </div>
                  </div>
                  <GradeBadge v={s.top} size="sm" tokens={tokens}/>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <BottomTabs active="me" tokens={tokens}/>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// GYM SEARCH — discover page
// ─────────────────────────────────────────────────────────────
const GymSearchScreen = ({ tokens }) => (
  <div style={{ position: 'absolute', inset: 0, background: tokens.bg, overflow: 'hidden' }}>
    <div style={{ paddingTop: 64, paddingBottom: 110, height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '24px 20px 8px' }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>암장 찾기</div>
      </div>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          background: tokens.subtle, borderRadius: 14, color: tokens.text3 }}>
          <CrimpIcon.search s={18}/>
          <span style={{ fontSize: 15, color: tokens.text3 }}>지역, 암장 이름으로 검색</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto' }}>
          <Chip tokens={tokens} active icon={<CrimpIcon.target s={14}/>}>내 근처</Chip>
          <Chip tokens={tokens}>볼더링</Chip>
          <Chip tokens={tokens}>리드</Chip>
          <Chip tokens={tokens}>24시간</Chip>
          <Chip tokens={tokens}>샤워실</Chip>
        </div>
      </div>

      {/* mini-map placeholder */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          height: 160, borderRadius: 16, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, ${tokens.subtle} 0%, ${tokens.subtle2} 100%)`,
          border: `1px solid ${tokens.hairline}`,
        }}>
          {/* fake map grid */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <pattern id="mapgrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke={tokens.hairline} strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mapgrid)"/>
            <path d="M0 90 Q 80 70 160 100 T 350 80" stroke={tokens.text4} strokeWidth="1.5" fill="none" opacity="0.5"/>
          </svg>
          {/* pins */}
          {[
            { x: '20%', y: '30%' }, { x: '55%', y: '50%' }, { x: '78%', y: '35%' }, { x: '40%', y: '70%' },
          ].map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%, -100%)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: tokens.accent.base,
                border: '3px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}/>
            </div>
          ))}
          <div style={{ position: 'absolute', bottom: 12, right: 12, padding: '8px 12px', borderRadius: 10,
            background: tokens.bg, border: `1px solid ${tokens.hairline}`, fontSize: 12, fontWeight: 700,
            color: tokens.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            지도 보기 <CrimpIcon.chevR s={14}/>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>인기 있는 곳</div>
        <span style={{ fontSize: 12, color: tokens.text3, fontWeight: 600 }}>거리순</span>
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: '서울볼더스 성수', a: '성동구 성수동 · 1.2km', open: true, rating: 4.8, friends: 24 },
          { n: '더클라임 홍대', a: '마포구 서교동 · 3.4km', open: true, rating: 4.6, friends: 18 },
          { n: '락트리 합정', a: '마포구 합정동 · 4.1km', open: false, rating: 4.7, friends: 9 },
          { n: '볼더원 강남', a: '강남구 역삼동 · 6.8km', open: true, rating: 4.5, friends: 12 },
        ].map((g, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px',
            background: tokens.bg, border: `1px solid ${tokens.hairline}`, borderRadius: 16,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 14,
              background: `linear-gradient(135deg, ${tokens.accent.soft} 0%, ${tokens.subtle2} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: tokens.accent.ink, fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em' }}>
              {g.n.slice(0,1)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{g.n}</div>
                <div style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                  background: g.open ? `color-mix(in oklab, ${tokens.semantic.success} 18%, ${tokens.bg})` : tokens.subtle2,
                  color: g.open ? tokens.semantic.success : tokens.text3, letterSpacing: '0.04em' }}>
                  {g.open ? '영업중' : '마감'}
                </div>
              </div>
              <div style={{ fontSize: 12, color: tokens.text3, marginTop: 2, fontWeight: 500 }}>{g.a}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
                <span style={{ fontSize: 11, color: tokens.text2, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>★ {g.rating}</span>
                <span style={{ fontSize: 11, color: tokens.text3, fontWeight: 600 }}>친구 {g.friends}명 다녀감</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <BottomTabs active="map" tokens={tokens}/>
  </div>
);

// ─────────────────────────────────────────────────────────────
// GYM DETAIL — single gym page with route grid
// ─────────────────────────────────────────────────────────────
const GymDetailScreen = ({ tokens }) => (
  <div style={{ position: 'absolute', inset: 0, background: tokens.bg, overflow: 'hidden' }}>
    {/* hero */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 280, zIndex: 0,
      background: `linear-gradient(160deg, ${tokens.accent.base} 0%, ${tokens.accent.ink} 100%)`,
      overflow: 'hidden',
    }}>
      <svg width="100%" height="100%" viewBox="0 0 390 280" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="320" cy="60" r="120" fill="rgba(255,255,255,0.08)"/>
        <circle cx="40" cy="220" r="80" fill="rgba(255,255,255,0.06)"/>
      </svg>
      {/* hold dots scattered */}
      {[
        { c: 'red', x: 60, y: 90 }, { c: 'yellow', x: 140, y: 60 }, { c: 'blue', x: 220, y: 110 },
        { c: 'pink', x: 300, y: 70 }, { c: 'white', x: 100, y: 170 }, { c: 'green', x: 200, y: 200 },
      ].map((d, i) => (
        <div key={i} style={{ position: 'absolute', top: d.y, left: d.x }}>
          <HoldDot color={d.c} size={20} tokens={tokens}/>
        </div>
      ))}
    </div>

    {/* nav */}
    <div style={{
      position: 'absolute', top: 54, left: 0, right: 0, padding: '8px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10,
    }}>
      <button style={{ width: 38, height: 38, borderRadius: 19, border: 'none',
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CrimpIcon.chevL s={20}/>
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ width: 38, height: 38, borderRadius: 19, border: 'none',
          background: 'rgba(255,255,255,0.92)', color: '#000', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M9 15s-6-4-6-9a4 4 0 0 1 6-3 4 4 0 0 1 6 3c0 5-6 9-6 9z"/></svg>
        </button>
        <button style={{ width: 38, height: 38, borderRadius: 19, border: 'none',
          background: 'rgba(255,255,255,0.92)', color: '#000', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CrimpIcon.dots s={20}/>
        </button>
      </div>
    </div>

    {/* sheet */}
    <div style={{
      position: 'absolute', top: 220, left: 0, right: 0, bottom: 0, zIndex: 5,
      background: tokens.bg, borderRadius: '24px 24px 0 0',
      paddingTop: 16, overflowY: 'auto', paddingBottom: 110,
    }}>
      {/* drag handle */}
      <div style={{ width: 36, height: 4, borderRadius: 2, background: tokens.text4, margin: '0 auto 16px' }}/>
      <div style={{ padding: '0 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
            background: `color-mix(in oklab, ${tokens.semantic.success} 18%, ${tokens.bg})`,
            color: tokens.semantic.success, letterSpacing: '0.04em' }}>영업중 · 22:00 마감</div>
          <span style={{ fontSize: 11, color: tokens.text3, fontWeight: 600 }}>지금 12명 운동중</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>서울볼더스 성수</div>
        <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 500, marginTop: 4 }}>성동구 성수일로 65 · 1층 · 1.2km</div>

        <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${tokens.hairline}`, borderBottom: `1px solid ${tokens.hairline}`, paddingBottom: 18 }}>
          <div><div style={{ fontSize: 11, color: tokens.text3, fontWeight: 700, marginBottom: 3, letterSpacing: '-0.01em' }}>평점</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>4.8 <span style={{ color: tokens.text3, fontWeight: 600, fontSize: 12 }}>(284)</span></div></div>
          <div><div style={{ fontSize: 11, color: tokens.text3, fontWeight: 700, marginBottom: 3, letterSpacing: '-0.01em' }}>루트</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>52개</div></div>
          <div><div style={{ fontSize: 11, color: tokens.text3, fontWeight: 700, marginBottom: 3, letterSpacing: '-0.01em' }}>친구</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>24명</div></div>
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 22, marginBottom: 10 }}>현재 세팅</div>
        <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 600, marginBottom: 12 }}>4월 14일 새 세팅 · D-3 교체 예정</div>
        {/* grade distribution */}
        <div style={{ display: 'flex', gap: 4, height: 80, alignItems: 'flex-end' }}>
          {[
            { v: 'V0', n: 4 }, { v: 'V1', n: 7 }, { v: 'V2', n: 10 }, { v: 'V3', n: 11 },
            { v: 'V4', n: 9 }, { v: 'V5', n: 6 }, { v: 'V6', n: 3 }, { v: 'V7', n: 2 },
          ].map(g => {
            const t = gradeTint(g.v);
            return (
              <div key={g.v} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: tokens.text2, fontVariantNumeric: 'tabular-nums' }}>{g.n}</div>
                <div style={{ width: '100%', height: g.n * 4, background: t.bg, borderRadius: 4 }}/>
                <div style={{ fontSize: 10, fontWeight: 700, color: tokens.text3 }}>{g.v}</div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 26, marginBottom: 10 }}>최근 완등</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { n: '서지우', t: '5분 전', v: 'V5', hold: 'red' },
            { n: '박민지', t: '12분 전', v: 'V6', hold: 'pink' },
            { n: '김재현', t: '23분 전', v: 'V4', hold: 'blue' },
          ].map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
              <div style={{ width: 32, height: 32, borderRadius: 16,
                background: `oklch(85% 0.05 ${(i*60+200)%360})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: tokens.text }}>{u.n.slice(0,1)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{u.n}</div>
                <div style={{ fontSize: 11, color: tokens.text3, fontWeight: 500 }}>{u.t} 완등</div>
              </div>
              <HoldDot color={u.hold} tokens={tokens} size={10}/>
              <GradeBadge v={u.v} size="sm" tokens={tokens}/>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* sticky CTA */}
    <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, padding: '12px 20px 0',
      background: `linear-gradient(to top, ${tokens.bg} 70%, ${tokens.bg}00)`, paddingTop: 16, zIndex: 10 }}>
      <PrimaryButton tokens={tokens}>여기서 세션 시작</PrimaryButton>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// PROFILE — me page
// ─────────────────────────────────────────────────────────────
const ProfileScreen = ({ tokens, variant = 'restrained' }) => {
  const bold = variant === 'bold';
  return (
    <div style={{ position: 'absolute', inset: 0, background: tokens.bg, overflow: 'hidden' }}>
      <div style={{ paddingTop: 64, paddingBottom: 110, height: '100%', overflowY: 'auto' }}>
        {/* settings icon */}
        <div style={{ position: 'absolute', top: 60, right: 16, zIndex: 5 }}>
          <button style={{ width: 40, height: 40, border: 'none', background: 'transparent', color: tokens.text2, cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="3"/><path d="M11 1v3M11 18v3M3.5 3.5l2 2M16.5 16.5l2 2M1 11h3M18 11h3M3.5 18.5l2-2M16.5 5.5l2-2"/></svg>
          </button>
        </div>

        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 36,
            background: `linear-gradient(135deg, ${tokens.accent.base} 0%, ${tokens.accent.ink} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em' }}>민</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>이민준</div>
            <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 500, marginTop: 2 }}>@minjun_climb · 클라이밍 2년차</div>
          </div>
        </div>

        {/* friends bar */}
        <div style={{ padding: '16px 20px 0', display: 'flex', gap: 22, fontSize: 13 }}>
          <div><span style={{ fontWeight: 800, color: tokens.text, fontVariantNumeric: 'tabular-nums' }}>184</span> <span style={{ color: tokens.text3, fontWeight: 600 }}>완등</span></div>
          <div><span style={{ fontWeight: 800, color: tokens.text, fontVariantNumeric: 'tabular-nums' }}>47</span> <span style={{ color: tokens.text3, fontWeight: 600 }}>세션</span></div>
          <div><span style={{ fontWeight: 800, color: tokens.text, fontVariantNumeric: 'tabular-nums' }}>62</span> <span style={{ color: tokens.text3, fontWeight: 600 }}>친구</span></div>
        </div>

        {/* hero — top grade */}
        <div style={{ margin: '20px 20px 0', padding: bold ? '28px 24px' : '22px 22px',
          background: tokens.subtle, borderRadius: 20 }}>
          <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 700, marginBottom: bold ? 12 : 8, letterSpacing: '-0.01em' }}>최고 그레이드 · 4월</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <div style={{ fontSize: bold ? 120 : 80, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 0.9, color: tokens.accent.base, fontVariantNumeric: 'tabular-nums' }}>V6</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: tokens.semantic.success, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CrimpIcon.trend s={14}/> 신기록
              </div>
              <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 500, marginTop: 2 }}>지난달 V5 → 이번달 V6</div>
            </div>
          </div>
        </div>

        {/* grade distribution lifetime */}
        <div style={{ padding: '24px 20px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>그레이드 분포</div>
          <span style={{ fontSize: 12, color: tokens.text3, fontWeight: 600 }}>전체 기간</span>
        </div>
        <div style={{ padding: '0 20px' }}>
          <div style={{ padding: '18px 18px', background: tokens.subtle, borderRadius: 16 }}>
            <div style={{ display: 'flex', gap: 4, height: 80, alignItems: 'flex-end' }}>
              {[
                { v: 'V0', n: 18 }, { v: 'V1', n: 32 }, { v: 'V2', n: 41 }, { v: 'V3', n: 38 },
                { v: 'V4', n: 32 }, { v: 'V5', n: 18 }, { v: 'V6', n: 5 },
              ].map(g => {
                const t = gradeTint(g.v);
                return (
                  <div key={g.v} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text2, fontVariantNumeric: 'tabular-nums' }}>{g.n}</div>
                    <div style={{ width: '100%', height: Math.max(6, g.n * 1.5), background: t.bg, borderRadius: 4 }}/>
                    <div style={{ fontSize: 10, fontWeight: 700, color: tokens.text3 }}>{g.v}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* badges */}
        <div style={{ padding: '24px 20px 8px', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>배지</div>
        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { e: '🏔', t: '첫 V5' },
            { e: '🔥', t: '7일 연속' },
            { e: '⚡', t: 'Flash 10' },
            { e: '🎯', t: 'V6 도전' },
          ].map((b, i) => (
            <div key={i} style={{
              padding: '14px 8px', background: tokens.subtle, borderRadius: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              opacity: i === 3 ? 0.4 : 1,
            }}>
              <div style={{ fontSize: 26 }}>{b.e}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: tokens.text2, letterSpacing: '-0.01em' }}>{b.t}</div>
            </div>
          ))}
        </div>
      </div>
      <BottomTabs active="me" tokens={tokens}/>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FEED — community feed
// ─────────────────────────────────────────────────────────────
const FeedScreen = ({ tokens }) => (
  <div style={{ position: 'absolute', inset: 0, background: tokens.bg, overflow: 'hidden' }}>
    <div style={{ paddingTop: 64, paddingBottom: 110, height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '24px 20px 12px' }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>피드</div>
      </div>
      <div style={{ padding: '0 20px 8px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        <Chip tokens={tokens} active>친구</Chip>
        <Chip tokens={tokens}>인기</Chip>
        <Chip tokens={tokens}>내 암장</Chip>
      </div>

      {[
        { n: '서지우', t: '15분 전', g: '서울볼더스 성수', v: 'V5', hold: 'red', kind: 'SEND',
          note: '드디어 V5 첫 완등! 크림프 잡고 데드포인트로 들어가는 무브가 핵심이었음.', likes: 24, comments: 6 },
        { n: '박민지', t: '1시간 전', g: '더클라임 홍대', v: 'V6', hold: 'pink', kind: 'FLASH',
          note: '플래시 성공 ⚡', likes: 41, comments: 12 },
        { n: '김재현', t: '3시간 전', g: '락트리 합정', v: 'V4', hold: 'blue', kind: 'SEND',
          note: '오버행 V4 4시간만에 완등.', likes: 18, comments: 3 },
      ].map((p, i) => (
        <div key={i} style={{
          margin: '0 20px 12px', padding: '16px 16px',
          background: tokens.bg, border: `1px solid ${tokens.hairline}`, borderRadius: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18,
              background: `oklch(82% 0.06 ${(i*70+180)%360})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: tokens.text }}>{p.n.slice(0,1)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{p.n}</div>
              <div style={{ fontSize: 11, color: tokens.text3, fontWeight: 500 }}>{p.t} · {p.g}</div>
            </div>
            <ResultMark kind={p.kind} size={26} tokens={tokens}/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <GradeBadge v={p.v} size="md" tokens={tokens}/>
            <HoldDot color={p.hold} tokens={tokens} size={14}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: tokens.text3, letterSpacing: '0.04em' }}>{p.kind}</span>
          </div>
          <div style={{ fontSize: 14, color: tokens.text, fontWeight: 500, lineHeight: 1.5, letterSpacing: '-0.01em' }}>{p.note}</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${tokens.hairline}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: tokens.text2, fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 14s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7z"/></svg>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.likes}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: tokens.text2, fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M2 6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H6l-3 2v-2a3 3 0 0 1-1-3z"/></svg>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.comments}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    <BottomTabs active="feed" tokens={tokens}/>
  </div>
);

Object.assign(window, {
  LoginScreen, MySessionsScreen, GymSearchScreen, GymDetailScreen, ProfileScreen, FeedScreen,
});

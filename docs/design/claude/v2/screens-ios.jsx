// screens-ios.jsx — Crimp iOS screens: Home, Session Start, Session Live

// Status bar (lightweight, matches ios-frame's IOSStatusBar but themeable)
const CrimpStatusBar = ({ tokens, time = '9:41' }) => {
  const c = tokens.text;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
      height: 54, padding: '18px 32px 0', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: c, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{time}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><g fill={c}><rect x="0" y="7" width="3" height="4" rx=".6"/><rect x="4.5" y="5" width="3" height="6" rx=".6"/><rect x="9" y="2.5" width="3" height="8.5" rx=".6"/><rect x="13.5" y="0" width="3" height="11" rx=".6"/></g></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={c} strokeOpacity=".4" fill="none"/><rect x="2" y="2" width="18" height="8" rx="1.5" fill={c}/></svg>
      </div>
    </div>
  );
};

const HomeIndicator = ({ tokens }) => (
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
    height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
    paddingBottom: 8, pointerEvents: 'none',
  }}>
    <div style={{ width: 139, height: 5, borderRadius: 100,
      background: tokens.theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.2)' }}/>
  </div>
);

// Device wrapper styled with Crimp tokens
const CrimpDevice = ({ children, tokens, w = 390, h = 844 }) => (
  <div style={{
    width: w, height: h, borderRadius: 48, overflow: 'hidden', position: 'relative',
    background: tokens.bg,
    boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 40px 80px rgba(15,20,25,0.15)',
    fontFamily: tokens.font.family,
    WebkitFontSmoothing: 'antialiased',
    color: tokens.text,
  }}>
    {/* dynamic island */}
    <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
      width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50 }}/>
    <CrimpStatusBar tokens={tokens}/>
    {children}
    <HomeIndicator tokens={tokens}/>
  </div>
);

// ─────────────────────────────────────────────────────────────
// HOME — restrained (A) vs bold (B)
// ─────────────────────────────────────────────────────────────
const HomeScreen = ({ tokens, variant = 'restrained', onStart }) => {
  const bold = variant === 'bold';
  return (
    <div style={{ position: 'absolute', inset: 0, background: tokens.bg, overflow: 'hidden' }}>
      <div style={{ paddingTop: 64, paddingBottom: 110, height: '100%', overflowY: 'auto' }}>
        {/* Greeting */}
        <div style={{ padding: '24px 20px 8px' }}>
          <div style={{ fontSize: 14, color: tokens.text3, fontWeight: 600, marginBottom: 4 }}>오늘도 잘 붙어봐요</div>
          <div style={{ fontSize: bold ? 32 : 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            안녕 민준,<br/>이번 주 <span style={{ color: tokens.accent.base }}>3회</span> 붙었어요
          </div>
        </div>

        {/* Big stats card */}
        <div style={{ margin: '24px 20px 0', padding: bold ? '32px 24px 28px' : '24px 22px',
          background: tokens.subtle, borderRadius: 20,
        }}>
          <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginBottom: bold ? 14 : 10 }}>이번 주 · 4월 20일–26일</div>
          {bold ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
                <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 0.9, color: tokens.text, fontVariantNumeric: 'tabular-nums' }}>14</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: tokens.text3, letterSpacing: '-0.03em' }}>완등</div>
              </div>
              <div style={{ display: 'flex', gap: 28, paddingTop: 16, borderTop: `1px solid ${tokens.hairline}` }}>
                <div><div style={{ fontSize: 12, color: tokens.text3, fontWeight: 600, marginBottom: 4 }}>세션</div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>3회</div></div>
                <div><div style={{ fontSize: 12, color: tokens.text3, fontWeight: 600, marginBottom: 4 }}>평균</div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>V4</div></div>
                <div><div style={{ fontSize: 12, color: tokens.text3, fontWeight: 600, marginBottom: 4 }}>최고</div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: tokens.accent.base }}>V6</div></div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>14</div>
                <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginTop: 6 }}>완등 · 세션 3회</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: tokens.accent.base }}>V6</div>
                <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginTop: 6 }}>최고 그레이드</div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ padding: '20px 20px 0' }}>
          <PrimaryButton tokens={tokens} onClick={onStart}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CrimpIcon.play s={18}/> 세션 시작하기
            </span>
          </PrimaryButton>
        </div>

        {/* Recent gyms */}
        <div style={{ padding: '28px 20px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>최근 암장</div>
          <button style={{ border: 'none', background: 'transparent', color: tokens.text3, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>전체</button>
        </div>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { n: '서울볼더스 성수', t: '2일 전 · 2시간 10분', v: 'V5', c: 3 },
            { n: '더클라임 홍대', t: '5일 전 · 1시간 45분', v: 'V4', c: 5 },
            { n: '락트리 합정', t: '1주 전 · 2시간 30분', v: 'V6', c: 6 },
          ].map((g, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', background: tokens.bg,
              border: `1px solid ${tokens.hairline}`, borderRadius: 16,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: tokens.subtle,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.text3 }}>
                <CrimpIcon.pin s={20}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{g.n}</div>
                <div style={{ fontSize: 12, color: tokens.text3, marginTop: 2, fontWeight: 500 }}>{g.t}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GradeBadge v={g.v} size="sm" tokens={tokens}/>
                <span style={{ fontSize: 12, color: tokens.text3, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>×{g.c}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '28px 20px 8px', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>이번 달 활동</div>
        <div style={{ padding: '0 20px' }}>
          <Heatmap tokens={tokens} accent={tokens.accent}/>
        </div>
      </div>
      <BottomTabs active="home" tokens={tokens}/>
    </div>
  );
};

// 5x7 activity heatmap
const Heatmap = ({ tokens, accent }) => {
  const rng = [0,2,0,1,3,2,0, 1,0,4,2,0,1,0, 0,2,3,0,1,2,4, 2,0,1,3,0,2,1, 0,1,2,0,3,2,0];
  const days = ['월','화','수','목','금','토','일'];
  const intensity = (v) => {
    if (!v) return tokens.chip;
    const a = 0.25 + v * 0.2;
    return `color-mix(in oklab, ${accent.base} ${a*100}%, ${tokens.chip})`;
  };
  return (
    <div style={{ padding: '16px 18px', background: tokens.subtle, borderRadius: 16 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 6, paddingTop: 2 }}>
          {days.map(d => <div key={d} style={{ fontSize: 10, height: 16, lineHeight: '16px', color: tokens.text4, fontWeight: 600 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, flex: 1 }}>
          {Array.from({length: 35}, (_, i) => (
            <div key={i} style={{ height: 16, borderRadius: 4, background: intensity(rng[i]) }}/>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SESSION START — 3 steps (gym → time → go)
// ─────────────────────────────────────────────────────────────
const SessionStartScreen = ({ tokens, step = 1, onNext, onBack, onCancel }) => (
  <div style={{ position: 'absolute', inset: 0, background: tokens.bg, overflow: 'hidden' }}>
    {/* top bar */}
    <div style={{
      position: 'absolute', top: 54, left: 0, right: 0, padding: '8px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10,
    }}>
      <button onClick={onBack} style={{ width: 40, height: 40, border: 'none', background: 'transparent',
        color: tokens.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {step === 1 ? <CrimpIcon.close s={22}/> : <CrimpIcon.chevL s={22}/>}
      </button>
      {/* progress pill */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ width: i === step ? 24 : 8, height: 4, borderRadius: 2,
            background: i <= step ? tokens.accent.base : tokens.subtle2,
            transition: 'all .3s cubic-bezier(.2,.8,.2,1)' }}/>
        ))}
      </div>
      <button onClick={onCancel} style={{ width: 40, height: 40, border: 'none', background: 'transparent', color: tokens.text3,
        fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>취소</button>
    </div>

    <div style={{ paddingTop: 120, paddingBottom: 120, height: '100%', overflowY: 'auto' }}>
      {step === 1 && <StepGym tokens={tokens}/>}
      {step === 2 && <StepTime tokens={tokens}/>}
      {step === 3 && <StepGo tokens={tokens}/>}
    </div>

    {/* bottom CTA */}
    <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, padding: '12px 20px 0',
      background: `linear-gradient(to top, ${tokens.bg} 70%, ${tokens.bg}00)`, paddingTop: 16 }}>
      <PrimaryButton tokens={tokens} onClick={onNext}>
        {step === 3 ? '시작' : '다음'}
      </PrimaryButton>
    </div>
  </div>
);

const StepGym = ({ tokens }) => (
  <div style={{ padding: '0 20px' }}>
    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: 6 }}>
      어디서 붙어요?
    </div>
    <div style={{ fontSize: 14, color: tokens.text3, fontWeight: 500, marginBottom: 24 }}>오늘 방문한 암장을 골라주세요</div>
    {/* search */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
      background: tokens.subtle, borderRadius: 14, marginBottom: 16, color: tokens.text3 }}>
      <CrimpIcon.search s={18}/>
      <span style={{ fontSize: 15, color: tokens.text3 }}>암장 이름 검색</span>
    </div>
    <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginBottom: 10 }}>최근 방문</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { n: '서울볼더스 성수', a: '성동구 성수동', sel: true },
        { n: '더클라임 홍대', a: '마포구 서교동' },
        { n: '락트리 합정', a: '마포구 합정동' },
        { n: '볼더원 강남', a: '강남구 역삼동' },
      ].map((g, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px',
          background: g.sel ? tokens.accent.soft : tokens.subtle,
          borderRadius: 16,
          outline: g.sel ? `2px solid ${tokens.accent.base}` : 'none',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: tokens.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: g.sel ? tokens.accent.base : tokens.text3 }}>
            <CrimpIcon.pin s={18}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: g.sel ? tokens.accent.ink : tokens.text }}>{g.n}</div>
            <div style={{ fontSize: 12, color: tokens.text3, marginTop: 2, fontWeight: 500 }}>{g.a}</div>
          </div>
          {g.sel && <div style={{ color: tokens.accent.base }}><CrimpIcon.check s={22}/></div>}
        </div>
      ))}
    </div>
  </div>
);

const StepTime = ({ tokens }) => (
  <div style={{ padding: '0 20px' }}>
    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: 6 }}>
      언제 시작해요?
    </div>
    <div style={{ fontSize: 14, color: tokens.text3, fontWeight: 500, marginBottom: 32 }}>지금 바로 시작할 수도 있어요</div>
    {/* big time */}
    <div style={{ padding: '36px 24px', background: tokens.subtle, borderRadius: 20, textAlign: 'center', marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginBottom: 10 }}>오늘, 4월 22일 화요일</div>
      <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 0.95, color: tokens.accent.base, fontVariantNumeric: 'tabular-nums' }}>
        19:30
      </div>
      <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginTop: 12 }}>탭해서 시간 변경</div>
    </div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['지금', '5분 전', '15분 전', '30분 전', '1시간 전'].map((t, i) => (
        <Chip key={i} tokens={tokens} active={i === 0}>{t}</Chip>
      ))}
    </div>
  </div>
);

const StepGo = ({ tokens }) => (
  <div style={{ padding: '0 20px' }}>
    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: 6 }}>
      준비됐어요
    </div>
    <div style={{ fontSize: 14, color: tokens.text3, fontWeight: 500, marginBottom: 24 }}>확인하고 시작해요</div>
    <div style={{ background: tokens.subtle, borderRadius: 20, padding: 4 }}>
      <div style={{ padding: '20px 20px', borderBottom: `1px solid ${tokens.hairline}` }}>
        <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 600, marginBottom: 6 }}>암장</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>서울볼더스 성수</div>
      </div>
      <div style={{ padding: '20px 20px', borderBottom: `1px solid ${tokens.hairline}` }}>
        <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 600, marginBottom: 6 }}>시작 시각</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>19:30 · 화요일</div>
      </div>
      <div style={{ padding: '20px 20px' }}>
        <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 600, marginBottom: 6 }}>지난 세션 평균</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
          1시간 52분 · <span style={{ color: tokens.accent.base }}>V4</span>
        </div>
      </div>
    </div>
    <div style={{ marginTop: 20, padding: '16px 18px', background: tokens.accent.soft, borderRadius: 14,
      fontSize: 13, color: tokens.accent.ink, fontWeight: 600, lineHeight: 1.5 }}>
      💪 이번엔 V5 완등이 목표였죠. 잘할 수 있어요.
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// SESSION LIVE — meta card + live timer + attempts timeline + FAB
// ─────────────────────────────────────────────────────────────
const SessionLiveScreen = ({ tokens, variant = 'restrained', elapsed = '01:23:47', onSend, flashing, attempts }) => {
  const bold = variant === 'bold';
  return (
    <div style={{ position: 'absolute', inset: 0, background: tokens.bg, overflow: 'hidden' }}>
      {/* flash overlay */}
      {flashing && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none',
          background: tokens.accent.base, animation: 'crimp-flash 1.2s ease-out forwards' }}>
          <div style={{ position: 'absolute', top: '40%', left: 0, right: 0, textAlign: 'center',
            animation: 'crimp-flash-text 1.2s ease-out forwards' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', opacity: 0.9, letterSpacing: '0.1em', marginBottom: 12 }}>SEND</div>
            <div style={{ fontSize: 96, fontWeight: 800, color: '#fff', letterSpacing: '-0.06em', lineHeight: 0.9 }}>완등!</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 12 }}>잘했어요 👏</div>
          </div>
        </div>
      )}

      {/* top bar */}
      <div style={{ position: 'absolute', top: 54, left: 0, right: 0, padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <button style={{ width: 40, height: 40, border: 'none', background: 'transparent', color: tokens.text, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CrimpIcon.chevL s={22}/>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
          background: `color-mix(in oklab, ${tokens.accent.base} 14%, ${tokens.bg})`,
          borderRadius: 999, color: tokens.accent.ink, fontSize: 12, fontWeight: 700 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: tokens.accent.base,
            animation: 'crimp-pulse 1.6s ease-in-out infinite' }}/>
          LIVE
        </div>
        <button style={{ width: 40, height: 40, border: 'none', background: 'transparent', color: tokens.text, cursor: 'pointer' }}>
          <CrimpIcon.dots s={22}/>
        </button>
      </div>

      <div style={{ paddingTop: 108, paddingBottom: 180, height: '100%', overflowY: 'auto' }}>
        {/* Meta + timer */}
        <div style={{ padding: '8px 20px 20px' }}>
          <div style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, marginBottom: 4 }}>서울볼더스 성수 · 19:30 시작</div>
          <div style={{ fontSize: bold ? 112 : 80, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 0.95,
            fontVariantNumeric: 'tabular-nums', color: tokens.text }}>
            {elapsed}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1, padding: '12px 14px', background: tokens.subtle, borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: tokens.text3, fontWeight: 700, marginBottom: 2, letterSpacing: '-0.01em' }}>완등</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: tokens.accent.base, fontVariantNumeric: 'tabular-nums' }}>5</div>
            </div>
            <div style={{ flex: 1, padding: '12px 14px', background: tokens.subtle, borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: tokens.text3, fontWeight: 700, marginBottom: 2, letterSpacing: '-0.01em' }}>시도</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>17</div>
            </div>
            <div style={{ flex: 1, padding: '12px 14px', background: tokens.subtle, borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: tokens.text3, fontWeight: 700, marginBottom: 2, letterSpacing: '-0.01em' }}>최고</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>V5</div>
            </div>
          </div>
        </div>

        {/* Attempts timeline */}
        <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>시도 타임라인</div>
          <span style={{ fontSize: 13, color: tokens.text3, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{attempts?.length || 6}</span>
        </div>
        <div style={{ padding: '4px 20px', position: 'relative' }}>
          {/* timeline line */}
          <div style={{ position: 'absolute', left: 32, top: 16, bottom: 16, width: 1.5, background: tokens.hairline }}/>
          {(attempts || defaultAttempts).map((a, i) => (
            <AttemptRow key={i} {...a} tokens={tokens}/>
          ))}
        </div>
      </div>

      {/* FAB + end */}
      <div style={{ position: 'absolute', bottom: 48, left: 0, right: 0, padding: '0 20px', display: 'flex', gap: 10 }}>
        <button onClick={() => onSend && onSend()} style={{
          flex: 1, height: 60, borderRadius: 30, border: 'none',
          background: tokens.accent.base, color: '#fff',
          fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em',
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 8px 24px color-mix(in oklab, ${tokens.accent.base} 40%, transparent)`,
        }}>
          <CrimpIcon.plus s={22}/> 시도 기록
        </button>
        <button style={{
          height: 60, padding: '0 22px', borderRadius: 30, border: 'none',
          background: tokens.subtle, color: tokens.text,
          fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>종료</button>
      </div>
    </div>
  );
};

const defaultAttempts = [
  { kind: 'SEND', v: 'V5', hold: 'red', note: '크림프 무브 성공', time: '방금' },
  { kind: 'TRY', v: 'V5', hold: 'red', note: '2번째 시도', time: '2분 전' },
  { kind: 'SEND', v: 'V4', hold: 'blue', note: '', time: '15분 전' },
  { kind: 'FLASH', v: 'V3', hold: 'yellow', note: '', time: '22분 전' },
  { kind: 'FAIL', v: 'V6', hold: 'black', note: '탑아웃 직전', time: '31분 전' },
  { kind: 'SEND', v: 'V4', hold: 'green', note: '', time: '48분 전' },
];

const AttemptRow = ({ kind, v, hold, note, time, tokens }) => {
  const isSend = kind === 'SEND' || kind === 'FLASH' || kind === 'ONSIGHT';
  return (
    <div style={{ display: 'flex', gap: 16, padding: '14px 0', alignItems: 'flex-start', position: 'relative' }}>
      <div style={{ width: 28, display: 'flex', justifyContent: 'center', paddingTop: 2, zIndex: 1 }}>
        <ResultMark kind={kind} size={26} tokens={tokens}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <GradeBadge v={v} size="sm" tokens={tokens}/>
          <HoldDot color={hold} tokens={tokens} size={12}/>
          <span style={{ fontSize: 12, color: tokens.text3, fontWeight: 700, letterSpacing: '0.04em' }}>{kind}</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 12, color: tokens.text3, fontWeight: 500 }}>{time}</span>
        </div>
        {note && <div style={{ fontSize: 14, color: tokens.text, fontWeight: 500, letterSpacing: '-0.01em' }}>{note}</div>}
      </div>
    </div>
  );
};

Object.assign(window, {
  CrimpDevice, HomeScreen, SessionStartScreen, SessionLiveScreen, Heatmap,
});

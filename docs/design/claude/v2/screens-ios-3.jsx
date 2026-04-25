// screens-ios-3.jsx — Crimp camera/video capture + attempt log sheet

// ─────────────────────────────────────────────────────────────
// CAMERA SHEET — full-screen overlay with viewfinder + record
// ─────────────────────────────────────────────────────────────
const CameraSheet = ({ tokens, mode = 'video', recording, onClose, onShoot }) => (
  <div style={{
    position: 'absolute', inset: 0, background: '#000', zIndex: 90,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }}>
    {/* Top bar */}
    <div style={{
      position: 'absolute', top: 54, left: 0, right: 0, padding: '8px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 5,
    }}>
      <button onClick={onClose} style={{
        width: 38, height: 38, borderRadius: 19, border: 'none',
        background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(20px)',
        color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CrimpIcon.close s={20}/>
      </button>
      {recording && (
        <div style={{
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(224,49,49,0.92)', color: '#fff',
          fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#fff',
            animation: 'crimp-pulse 1.2s ease-in-out infinite' }}/>
          REC · 00:12
        </div>
      )}
      <button style={{
        width: 38, height: 38, borderRadius: 19, border: 'none',
        background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 8a7 7 0 0 1 12-4l2-2v6h-6l2-2a5 5 0 0 0-8 2"/><path d="M17 12a7 7 0 0 1-12 4l-2 2v-6h6l-2 2a5 5 0 0 0 8-2"/></svg>
      </button>
    </div>

    {/* Viewfinder — fake climbing scene */}
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* gradient backdrop simulating gym wall */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 40%, #5a4a3c 0%, #2a221c 60%, #0d0a08 100%)',
      }}/>
      {/* simulated climbing holds */}
      {[
        { c: '#E03131', x: '22%', y: '20%', s: 28, r: 20 },
        { c: '#1C7ED6', x: '52%', y: '35%', s: 36, r: -15 },
        { c: '#F59F00', x: '38%', y: '55%', s: 24, r: 5 },
        { c: '#E64980', x: '68%', y: '62%', s: 32, r: 30 },
        { c: '#2F9E44', x: '28%', y: '78%', s: 22, r: -10 },
        { c: '#7048E8', x: '78%', y: '28%', s: 26, r: 12 },
      ].map((h, i) => (
        <div key={i} style={{
          position: 'absolute', left: h.x, top: h.y,
          width: h.s, height: h.s * 0.7,
          background: h.c, borderRadius: '50% 50% 35% 35%',
          transform: `rotate(${h.r}deg)`,
          boxShadow: `inset -2px -3px 6px rgba(0,0,0,0.4), 0 4px 10px rgba(0,0,0,0.3)`,
        }}/>
      ))}
      {/* climber silhouette */}
      <div style={{
        position: 'absolute', left: '40%', bottom: '20%',
        width: 60, height: 140, opacity: 0.7,
      }}>
        <svg viewBox="0 0 60 140" fill="rgba(0,0,0,0.55)">
          <circle cx="32" cy="18" r="11"/>
          <path d="M22 30 L40 30 Q44 30 44 35 L48 70 L42 95 L44 130 L36 130 L34 100 L28 100 L26 130 L18 130 L20 95 L14 70 L18 35 Q18 30 22 30 Z"/>
          <path d="M48 38 L58 50 L52 56 L42 44 Z"/>
          <path d="M14 38 L4 50 L10 56 L20 44 Z"/>
        </svg>
      </div>

      {/* focus reticle */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 80, height: 80, border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: 4,
      }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            position: 'absolute',
            [['top','top','bottom','bottom'][i]]: -1,
            [['left','right','left','right'][i]]: -1,
            width: 10, height: 10,
            borderTop: i < 2 ? '2px solid #fff' : 'none',
            borderBottom: i >= 2 ? '2px solid #fff' : 'none',
            borderLeft: i % 2 === 0 ? '2px solid #fff' : 'none',
            borderRight: i % 2 === 1 ? '2px solid #fff' : 'none',
          }}/>
        ))}
      </div>

      {/* exposure slider on right */}
      <div style={{
        position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="3.5"/><path d="M10 1.5v2M10 16.5v2M3 10h-1.5M16.5 10h2M5 5l-1-1M16 16l-1-1M5 15l-1 1M16 4l-1 1"/></svg>
        <div style={{ width: 2, height: 80, background: 'rgba(255,255,255,0.4)', borderRadius: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: 6, background: '#FAB005' }}/>
        </div>
      </div>

      {/* timestamp / route label overlay */}
      <div style={{
        position: 'absolute', left: 16, bottom: 16, padding: '8px 12px',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
        borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <GradeBadge v="V5" size="sm" tokens={{ ...tokens }}/>
        <HoldDot color="red" tokens={tokens} size={10}/>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>서울볼더스 · 19:42</span>
      </div>
    </div>

    {/* Mode switcher */}
    <div style={{ padding: '14px 0 10px', display: 'flex', justifyContent: 'center', gap: 28, position: 'relative', zIndex: 5 }}>
      {[
        { k: 'photo', l: '사진' },
        { k: 'video', l: '동영상' },
        { k: 'beta', l: '베타' },
      ].map(m => {
        const on = m.k === mode;
        return (
          <div key={m.k} style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
            color: on ? tokens.accent.flash : 'rgba(255,255,255,0.6)',
            padding: '6px 4px', position: 'relative',
          }}>
            {m.l}
            {on && <div style={{
              position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: 4, height: 4, borderRadius: 2, background: tokens.accent.flash,
            }}/>}
          </div>
        );
      })}
    </div>

    {/* Bottom bar — gallery / shutter / flip */}
    <div style={{
      padding: '0 30px 50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#000', position: 'relative', zIndex: 5,
    }}>
      {/* gallery thumb */}
      <div style={{
        width: 50, height: 50, borderRadius: 10,
        background: `linear-gradient(135deg, ${tokens.accent.base} 0%, ${tokens.accent.ink} 100%)`,
        position: 'relative', overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.2)',
      }}>
        <div style={{
          position: 'absolute', bottom: 4, right: 4, padding: '2px 5px',
          background: 'rgba(0,0,0,0.6)', borderRadius: 4,
          fontSize: 9, fontWeight: 800, color: '#fff',
        }}>3</div>
      </div>

      {/* Shutter */}
      <button onClick={onShoot} style={{
        width: 78, height: 78, borderRadius: 39, border: 'none',
        background: 'transparent', padding: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 39,
          border: '4px solid #fff',
        }}/>
        <div style={{
          width: recording ? 32 : 60, height: recording ? 32 : 60,
          borderRadius: recording ? 6 : 30,
          background: mode === 'video' ? '#E03131' : '#fff',
          transition: 'all .25s cubic-bezier(.2,.8,.2,1)',
        }}/>
      </button>

      {/* flip camera */}
      <button style={{
        width: 50, height: 50, borderRadius: 25, border: 'none',
        background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h13l-3-3M19 14H6l3 3"/><circle cx="11" cy="11" r="3" strokeDasharray="2 2"/></svg>
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// LOG ATTEMPT SHEET — bottom sheet to log a try with optional video
// ─────────────────────────────────────────────────────────────
const LogAttemptSheet = ({ tokens, onClose, onCamera, onSave }) => {
  const [grade, setGrade] = React.useState('V5');
  const [hold, setHold] = React.useState('red');
  const [result, setResult] = React.useState('SEND');
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 70,
      background: 'rgba(15,20,25,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: tokens.bg, color: tokens.text,
        borderRadius: '24px 24px 0 0', padding: '12px 0 50px',
        maxHeight: '92%', overflowY: 'auto',
        animation: 'crimp-sheet-in .3s cubic-bezier(.2,.8,.2,1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: tokens.text4, margin: '0 auto 16px' }}/>

        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>시도 기록</div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: tokens.text3,
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>취소</button>
        </div>

        {/* Result picker — visual */}
        <div style={{ padding: '0 20px', marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 700, marginBottom: 10, letterSpacing: '0.04em' }}>결과</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {['SEND','FLASH','TRY','FAIL'].map(r => {
              const on = result === r;
              return (
                <button key={r} onClick={() => setResult(r)} style={{
                  padding: '14px 8px', borderRadius: 14, border: 'none',
                  background: on ? tokens.text : tokens.subtle,
                  color: on ? tokens.bg : tokens.text2,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <ResultMark kind={r} size={28} tokens={tokens}/>
                  <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.03em' }}>{r}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade picker */}
        <div style={{ padding: '0 20px', marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 700, marginBottom: 10, letterSpacing: '0.04em' }}>그레이드</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {['V0','V1','V2','V3','V4','V5','V6','V7','V8'].map(v => {
              const on = grade === v;
              return (
                <button key={v} onClick={() => setGrade(v)} style={{
                  padding: 4, borderRadius: 14, border: 'none', background: 'transparent',
                  cursor: 'pointer', flexShrink: 0,
                  outline: on ? `2px solid ${tokens.accent.base}` : 'none',
                  outlineOffset: on ? 2 : 0,
                }}>
                  <GradeBadge v={v} size="lg" tokens={tokens}/>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hold color picker */}
        <div style={{ padding: '0 20px', marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 700, marginBottom: 10, letterSpacing: '0.04em' }}>홀드 색</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['red','blue','yellow','green','white','black','pink','orange','purple','gray'].map(c => {
              const on = hold === c;
              return (
                <button key={c} onClick={() => setHold(c)} style={{
                  width: 36, height: 36, borderRadius: 18, border: 'none', padding: 0,
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  outline: on ? `2px solid ${tokens.accent.base}` : 'none',
                  outlineOffset: 2,
                }}>
                  <HoldDot color={c} size={26} tokens={tokens}/>
                </button>
              );
            })}
          </div>
        </div>

        {/* Camera CTA */}
        <div style={{ padding: '0 20px', marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 700, marginBottom: 10, letterSpacing: '0.04em' }}>영상 · 사진</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onCamera && onCamera('video')} style={{
              flex: 1, height: 88, borderRadius: 16, border: `1.5px dashed ${tokens.hairline}`,
              background: tokens.subtle, color: tokens.text2,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><rect x="2" y="6" width="15" height="14" rx="2.5"/><path d="M17 11l6-3v10l-6-3z"/></svg>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>동영상 촬영</div>
              <div style={{ fontSize: 10, color: tokens.text3, fontWeight: 600 }}>최대 60초</div>
            </button>
            <button onClick={() => onCamera && onCamera('photo')} style={{
              flex: 1, height: 88, borderRadius: 16, border: `1.5px dashed ${tokens.hairline}`,
              background: tokens.subtle, color: tokens.text2,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M3 8a2 2 0 0 1 2-2h3l1.5-2h7L18 6h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="13" cy="13" r="4"/></svg>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>사진 촬영</div>
              <div style={{ fontSize: 10, color: tokens.text3, fontWeight: 600 }}>또는 갤러리</div>
            </button>
          </div>
        </div>

        {/* Note */}
        <div style={{ padding: '0 20px', marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: tokens.text3, fontWeight: 700, marginBottom: 10, letterSpacing: '0.04em' }}>메모 (선택)</div>
          <div style={{ padding: '14px 16px', background: tokens.subtle, borderRadius: 14,
            fontSize: 14, color: tokens.text3, fontWeight: 500, minHeight: 56 }}>
            크림프 잡고 데드포인트 무브가 핵심...
          </div>
        </div>

        {/* Save */}
        <div style={{ padding: '0 20px' }}>
          <PrimaryButton tokens={tokens} onClick={onSave}>저장</PrimaryButton>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VIDEO PREVIEW — shown after recording, in attempt detail
// ─────────────────────────────────────────────────────────────
const VideoPreviewCard = ({ tokens }) => (
  <div style={{
    width: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative',
    background: '#000', aspectRatio: '9 / 16', maxHeight: 280,
  }}>
    {/* Same simulated viewfinder content */}
    <div style={{ position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at 30% 40%, #5a4a3c 0%, #2a221c 60%, #0d0a08 100%)' }}/>
    {[
      { c: '#E03131', x: '22%', y: '25%', s: 22 },
      { c: '#1C7ED6', x: '52%', y: '40%', s: 28 },
      { c: '#F59F00', x: '38%', y: '60%', s: 18 },
      { c: '#E64980', x: '68%', y: '32%', s: 24 },
    ].map((h, i) => (
      <div key={i} style={{
        position: 'absolute', left: h.x, top: h.y, width: h.s, height: h.s * 0.7,
        background: h.c, borderRadius: '50% 50% 35% 35%',
        boxShadow: 'inset -2px -3px 6px rgba(0,0,0,0.4)',
      }}/>
    ))}
    {/* play overlay */}
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
      }}>
        <CrimpIcon.play s={22}/>
      </div>
    </div>
    {/* duration pill */}
    <div style={{
      position: 'absolute', top: 10, right: 10, padding: '4px 8px',
      background: 'rgba(0,0,0,0.6)', borderRadius: 6,
      color: '#fff', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
    }}>0:18</div>
  </div>
);

Object.assign(window, { CameraSheet, LogAttemptSheet, VideoPreviewCard });

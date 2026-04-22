# Claude Design 산출물

`docs/design/brief.md` 를 Claude Design 에 넘겨 받은 원본 프로토타입.
이 폴더는 **참조용 원본** 이며, 실제 구현 토큰은 `docs/design/tokens.json`
(뒤에서 갱신 예정) 으로 재수집한다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `Crimp.html` | 디자인 캔버스 진입점 (로컬에서 열면 React 로 전체 렌더) |
| `tokens.jsx` | Light/Dark × blue/orange 토큰 정의 |
| `primitives.jsx` | 아이콘 · GradeBadge · ResultMark · Chip · HoldDot · Button · BigStat · Skeleton · BottomTabs |
| `ios-frame.jsx` | iOS 장치 프레임 래퍼 |
| `screens-ios.jsx` | 홈 · 세션 시작 (3 step) · 세션 라이브 · 완등 플래시 |
| `screens-web.jsx` | Web 대시보드 |
| `design-canvas.jsx` | 아트보드 레이아웃 컨테이너 |

## 변형

- **A · 절제됨** — Toss 블루(`#3182F6`) · 숫자 56px · 균형 잡힌 밀도
- **B · 과감함** — Climb 오렌지(`#FF6B35`) · 숫자 120px+ · 시각적 임팩트

Phase 1 에 하나를 선택해 전면 적용한다. (양 변형을 런타임 스위칭하지 않음)

## 로컬에서 보기

```bash
cd docs/design/claude
python3 -m http.server 8080
# http://localhost:8080/Crimp.html 접속
```

## 구현 매핑 (예정)

1. `tokens.jsx` → `docs/design/tokens.json` (W3C Design Tokens 포맷) 갱신
2. `primitives.jsx` → `web/src/components/primitives/*` + `app/src/components/primitives/*`
   (RN 과 Web 에서 동일 이름, 각 플랫폼 네이티브 구현)
3. `screens-ios.jsx`·`screens-web.jsx` → 기존 `app/src/screens/**` · `web/app/**` 에 디자인 적용

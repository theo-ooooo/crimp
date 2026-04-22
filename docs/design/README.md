# Crimp 디자인 시스템

클라이밍 커뮤니티 Crimp의 시각 언어·토큰·컴포넌트 규약.

## 원칙

1. **Trust & Community First** — 클라이머가 서로 신뢰할 수 있는 시각 언어
2. **Motion as Feedback** — 완등·세션의 성취감을 마이크로 인터랙션으로
3. **Content over Chrome** — 영상·사진이 UI보다 우선
4. **Accessible by default** — 색맹·저시력·한 손 조작을 기본 고려 (WCAG AA)

## 문서

| 파일 | 내용 |
| --- | --- |
| `tokens.json` | 디자인 토큰 (컬러·타이포·간격·radius·shadow) — 단일 소스 |
| `tokens-mapping.md` | 토큰 이름 매핑표 (JSON ↔ Web TS ↔ App TS ↔ CSS var ↔ Tailwind 클래스) |
| `components.md` | 컴포넌트 스펙 (Button, Card, FeedItem, GradeChip, …) |
| `accessibility.md` | WCAG AA 체크리스트, 터치 타겟·대비비 규약 |
| `figma.md` | Figma 파일 링크 인덱스·접근 요청 절차 |
| `flows/` | 유저 플로우 다이어그램 (Mermaid) |

## 토큰 사용 규약

- 웹: Tailwind theme extension에서 `tokens.json`을 import
- 앱: 네이티브 StyleSheet에서 동일 토큰 import
- 디자이너·개발자 모두 **이 파일 외부에서 색상·간격을 하드코딩하지 않음**

자세한 에이전트 규약은 [`../../agents/design.md`](../../agents/design.md).

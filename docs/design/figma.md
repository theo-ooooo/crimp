# Figma 링크 인덱스

## 파일

| 파일 | URL | 비고 |
| --- | --- | --- |
| Crimp — Design System | _TBD (디자이너 합류 후 연결)_ | 토큰·컴포넌트 라이브러리 |
| Crimp — Mobile (App) | _TBD_ | 앱 화면 모음 |
| Crimp — Web | _TBD_ | 랜딩·관리자 |
| Crimp — User Flows | _TBD_ | FigJam 플로우·IA |

## 접근 요청

1. 프로젝트 Slack 채널 `#design` 에 이메일 제공
2. 에디터(Editor) 또는 뷰어(Viewer) 권한 요청
3. `docs/design/figma.md` PR로 이 인덱스 갱신

## 핸드오프 규약

- 개발 핸드오프 시 **Dev Mode** 활성화
- 네이밍은 `[P0|P1|P2] <Component>/<variant>` 형식
- 토큰은 Figma Variables와 `tokens.json`이 **이름·값 1:1** 동기화
- 변경 시: Figma Variables 수정 → `tokens.json` 갱신 PR → 개발자 반영

## Tokens Studio 플러그인 (권장)

- Figma Variables ↔ `tokens.json` 양방향 동기화
- 저장소: `docs/design/tokens.json` 경로를 사용
- 세팅: Tokens Studio → GitHub sync → 이 레포의 `docs/design/tokens.json`

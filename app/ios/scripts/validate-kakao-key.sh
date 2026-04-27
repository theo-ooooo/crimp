#!/usr/bin/env bash
#
# Crimp iOS — KAKAO_APP_KEY 빌드 시점 검증.
#
# 사용:
#   1) Xcode 프로젝트의 Build Phase 에 "Run Script" 추가, Compile Sources 보다 먼저 배치.
#   2) 스크립트 본문:  "${SRCROOT}/scripts/validate-kakao-key.sh"
#
# 의도:
#   - `$(KAKAO_APP_KEY)` 가 xcconfig 누락으로 치환 안 되거나 빈 값으로 들어가는 사고 방지.
#   - 빈 값이면 빌드 단계에서 실패해서 RN Kakao 모듈 첫 호출 시 force-unwrap 크래시
#     보다 먼저 명시적 에러를 던진다.
#
# 환경 변수: KAKAO_APP_KEY (xcconfig 또는 User-Defined Build Setting 으로 주입).

set -euo pipefail

if [[ -z "${KAKAO_APP_KEY:-}" || "${KAKAO_APP_KEY}" == "your_kakao_native_app_key_here" ]]; then
  echo "error: KAKAO_APP_KEY 가 비어있거나 placeholder 값입니다." >&2
  echo "  → app/ios/Crimp.xcconfig 를 만들고 실제 키를 채우세요 (Crimp.xcconfig.sample 참조)." >&2
  echo "  → 그리고 Xcode > Project > Configurations 에서 Crimp.xcconfig 를 1회 지정." >&2
  exit 1
fi

if [[ "${KAKAO_APP_KEY}" == \$* ]]; then
  echo "error: KAKAO_APP_KEY 가 \\\$(KAKAO_APP_KEY) 리터럴로 들어왔습니다 (xcconfig 미연결)." >&2
  echo "  → app/ios/README.md §3 의 Configurations 셋업 절차 참고." >&2
  exit 1
fi

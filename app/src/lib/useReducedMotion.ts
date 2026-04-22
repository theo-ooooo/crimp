import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * 사용자가 시스템에서 모션 감소 설정을 켰는지 반환.
 *
 * 사용처: 애니메이션·전환을 정적 상태로 대체 (밝기 플래시·스프링 바운스 등을 생략).
 * 웹 `prefers-reduced-motion: reduce` 와 같은 의도.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (mounted) setReduced(on);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (on) => setReduced(on),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

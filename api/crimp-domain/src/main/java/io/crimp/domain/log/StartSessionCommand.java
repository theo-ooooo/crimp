package io.crimp.domain.log;

import java.time.Instant;

/**
 * 세션 시작 커맨드.
 *
 * {@code gymExtId} 가 주어지면 서비스 레이어에서 내부 {@code gymId} 로 해석한다.
 * 동시에 {@code gymId} 가 제공된 경우에는 {@code gymExtId} 해석이 우선.
 * (암장 미지정 free-form 기록은 {@code gymExtId}, {@code gymId} 모두 null 이어도 허용.)
 */
public record StartSessionCommand(
        String gymExtId,
        Long gymId,
        String gymNameRaw,
        Instant startedAt
) {}

package io.crimp.domain.gym.sync;

/**
 * 외부 장소 검색 API 가 호출 제한을 반환했을 때 사용하는 도메인 예외.
 *
 * <p>grid sync 는 이 예외를 만나면 같은 실행에서 남은 region 을 계속 호출하지 않고 중단해
 * quota 낭비와 실패 로그 폭증을 막는다.
 */
public class GymSyncRateLimitException extends RuntimeException {
    public GymSyncRateLimitException(String message) {
        super(message);
    }
}

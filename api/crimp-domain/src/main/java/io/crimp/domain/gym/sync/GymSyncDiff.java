package io.crimp.domain.gym.sync;

import io.crimp.core.entity.gym.Gym;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 외부 소스가 가져온 {@link RemoteGym} 목록과 DB 의 현재 {@link Gym} 목록을 비교해
 * 신규/업데이트/누락(폐업 후보) 후보를 산출한다.
 *
 * <p>매칭 키 — `(이름, 주소)` 의 정규화된 페어. 같은 도로명 주소에 같은 이름이
 * 있으면 동일 매장으로 판단. 좌표 차이는 본 단계에서 결정 인자가 아니다 (외부 소스의
 * 좌표 정확도가 더 높다고 가정).
 *
 * <p>본 클래스는 사이드 이펙트가 없는 순수 함수 — 단위 테스트 가능. DB 적용은
 * {@link GymSyncService} 가 담당.
 */
public final class GymSyncDiff {

    private GymSyncDiff() {}

    /**
     * @param remote 외부 소스가 가져온 매장 목록
     * @param current DB 의 현재 매장 목록
     * @return 신규/업데이트/누락 후보를 분류한 결과
     */
    public static Result compute(List<RemoteGym> remote, List<Gym> current) {
        Map<String, Gym> currentByKey = new HashMap<>();
        for (Gym g : current) {
            currentByKey.put(matchKey(g.getName(), g.getAddress()), g);
        }

        List<RemoteGym> additions = new ArrayList<>();
        List<UpdateCandidate> updates = new ArrayList<>();
        List<String> matchedKeys = new ArrayList<>();

        for (RemoteGym r : remote) {
            String key = matchKey(r.name(), r.address());
            Gym matched = currentByKey.get(key);
            if (matched == null) {
                additions.add(r);
                continue;
            }
            matchedKeys.add(key);
            if (hasMeaningfulChange(matched, r)) {
                updates.add(new UpdateCandidate(matched, r));
            }
        }

        // 외부에서 한 번도 매칭 안 된 DB rows = 폐업 후보. 단, 본 단계는 단일 외부
        // 호출만 다루므로 "이번 호출에서 안 보인 rows" 일 뿐 — 실제 폐업 마커는 다중
        // 호출(전 지역 스캔) 결과를 모두 합친 후 별도 단계에서 결정한다.
        List<Gym> missing = new ArrayList<>();
        Map<String, Gym> seen = new HashMap<>(currentByKey);
        matchedKeys.forEach(seen::remove);
        missing.addAll(seen.values());

        return new Result(additions, updates, missing);
    }

    /**
     * 동일 매장 판단 키 — trim + lower-case + 공백 압축. 대소문자/공백 변형으로
     * 인한 잘못된 신규 등록을 막는다.
     */
    static String matchKey(String name, String address) {
        return normalize(name) + "|" + normalize(address);
    }

    private static String normalize(String s) {
        if (s == null) return "";
        // 모든 공백류를 단일 ASCII space 로 합치고 trim + lower.
        StringBuilder sb = new StringBuilder(s.length());
        boolean lastWasSpace = true;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isWhitespace(c) || Character.isSpaceChar(c)) {
                if (!lastWasSpace) {
                    sb.append(' ');
                    lastWasSpace = true;
                }
            } else {
                sb.append(Character.toLowerCase(c));
                lastWasSpace = false;
            }
        }
        return sb.toString().trim();
    }

    private static boolean hasMeaningfulChange(Gym current, RemoteGym remote) {
        // 좌표가 의미 있게 다르거나 (50m 이상 차이) phone/brand 가 변경된 경우 update 후보.
        if (notEqual(current.getBrand(), remote.brand())) return true;
        if (notEqual(current.getPhone(), remote.phone())) return true;
        BigDecimal latDelta = current.getLat().subtract(remote.lat()).abs();
        BigDecimal lngDelta = current.getLng().subtract(remote.lng()).abs();
        // 위도 0.0005 ≒ 55m, 경도 0.0005 ≒ 44m (서울 위도). 어느 쪽이든 의미 있는 이동으로 봄.
        return latDelta.compareTo(new BigDecimal("0.0005")) > 0
                || lngDelta.compareTo(new BigDecimal("0.0005")) > 0;
    }

    private static boolean notEqual(String a, String b) {
        if (a == null && b == null) return false;
        if (a == null || b == null) return true;
        return !a.equals(b);
    }

    /** 본 결과는 도메인 record — 호출자가 그대로 직렬화하거나 audit 로그로 남길 수 있다. */
    public record Result(
            List<RemoteGym> additions,
            List<UpdateCandidate> updates,
            List<Gym> missingFromRemote
    ) {
    }

    public record UpdateCandidate(Gym current, RemoteGym remote) {}
}

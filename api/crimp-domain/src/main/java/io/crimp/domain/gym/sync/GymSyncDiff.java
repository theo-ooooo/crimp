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

        return new Result(remote.size(), additions, updates, missing);
    }

    /**
     * 동일 매장 판단 키 — trim + lower-case + 공백 압축 + 매장명 접미어 정규화.
     * 대소문자/공백/접미어 변형으로 인한 잘못된 신규 등록을 막는다.
     *
     * <p>(PR #111) 매장명 접미어 정규화 추가 — "더클라임 강남" / "더클라임 강남점" /
     * "더클라임강남점" 모두 동일 매장으로 매칭.
     */
    static String matchKey(String name, String address) {
        return normalizeName(name) + "|" + normalize(address);
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

    /**
     * (PR #111) 매장명 정규화 — {@link #normalize} 기본 처리 + Kakao 가 접미어로 붙이는
     * "지점/직영점/점" 등을 제거하고 모든 공백 제거. 접미어 만 제거하면 "강남" 과 "강남점" 가
     * 다르게 키 매칭되는 회귀가 남으므로, 공백도 함께 제거해 "강남" / "강 남" / "강남점" / "강남 점"
     * 모두 같은 키로 수렴.
     */
    static String normalizeName(String name) {
        String base = normalize(name);
        // 마지막 "지점" / "직영점" / "점" 제거 (한 번만).
        if (base.endsWith("직영점")) {
            base = base.substring(0, base.length() - 3);
        } else if (base.endsWith("지점")) {
            base = base.substring(0, base.length() - 2);
        } else if (base.endsWith("점")) {
            base = base.substring(0, base.length() - 1);
        }
        // 공백 모두 제거 — "더클라임 강남" / "더클라임강남" 매칭.
        return base.replace(" ", "").trim();
    }

    private static boolean hasMeaningfulChange(Gym current, RemoteGym remote) {
        // 좌표가 의미 있게 다르거나 (50m 이상 차이) phone/brand 가 변경된 경우 update 후보.
        // [PR #85 리뷰 I3] remote 가 null 이면 "외부에서 정보 누락" 으로 간주해 변경 인자에서 제외
        // — Gym.applyRemoteUpdate 의 null 보존 정책과 일관. 외부가 일시적으로 phone 을 빠뜨려도
        // 기존 값이 보존되며, 이 경우 diff 에도 update 후보로 잡히지 않아 카운트가 어긋나지 않는다.
        if (remote.brand() != null && notEqual(current.getBrand(), remote.brand())) return true;
        if (remote.phone() != null && notEqual(current.getPhone(), remote.phone())) return true;
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

    /**
     * 본 결과는 도메인 record — 호출자가 그대로 직렬화하거나 audit 로그로 남길 수 있다.
     *
     * <p>{@code remoteCount} 는 외부 소스가 가져온 총 매장 수 — additions + (matched, 즉
     * updates + 변경 없음) 의 합. 운영 감사 로그에 그대로 기록 (PR #87, Phase 1.5).
     */
    public record Result(
            int remoteCount,
            List<RemoteGym> additions,
            List<UpdateCandidate> updates,
            List<Gym> missingFromRemote
    ) {
    }

    public record UpdateCandidate(Gym current, RemoteGym remote) {}
}

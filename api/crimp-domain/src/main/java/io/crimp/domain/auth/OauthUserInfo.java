package io.crimp.domain.auth;

import io.crimp.core.entity.enums.OauthProvider;

/**
 * provider 가 발급한 id_token 검증 후 추출한 사용자 정보.
 *
 * <p>(PR #112) {@code nonce} 추가 — id_token 의 {@code nonce} 클레임 값 (검증 비교용).
 * provider 별 규약:
 * <ul>
 *   <li>Apple: client 가 보낸 nonce 의 SHA-256 hex 가 id_token 에 박힘.
 *       비교는 {@code AuthService} 가 client 의 원본 nonce 를 SHA-256 해 일치 검사.</li>
 *   <li>Kakao: client 가 보낸 nonce 가 그대로 id_token 에 박힘. 평문 직접 비교.</li>
 * </ul>
 * id_token 에 nonce 클레임이 없으면 {@code null}.
 */
public record OauthUserInfo(
        OauthProvider provider,
        String providerUid,
        String email,
        String nonce
) {}

package io.crimp.domain.user;

import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.repository.log.ClimbingSessionRepository;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MeStatsServiceTest {

    private ClimbingSessionRepository sessionRepo;
    private SessionAttemptRepository attemptRepo;
    private MeStatsService service;

    /**
     * 고정 Clock: 2026-04-22 (수요일) 12:00 UTC.
     * ISO 주 경계는 2026-04-20 (월) ~ 2026-04-26 (일) 이어야 한다.
     */
    private static final Instant FIXED_NOW = Instant.parse("2026-04-22T12:00:00Z");
    private static final LocalDate EXPECTED_WEEK_START = LocalDate.parse("2026-04-20");
    private static final LocalDate EXPECTED_WEEK_END = LocalDate.parse("2026-04-26");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @BeforeEach
    void setUp() {
        sessionRepo = mock(ClimbingSessionRepository.class);
        attemptRepo = mock(SessionAttemptRepository.class);
        Clock fixed = Clock.fixed(FIXED_NOW, ZoneOffset.UTC);
        service = new MeStatsService(sessionRepo, attemptRepo, fixed);
    }

    @Test
    void getStats_emptyUser_returnsZerosAndNullTopGrade() {
        when(sessionRepo.countByUserIdAndDeletedAtIsNull(42L)).thenReturn(0L);
        when(sessionRepo.countByUserIdAndDeletedAtIsNullAndStartedAtBetween(eq(42L), any(), any()))
                .thenReturn(0L);
        when(attemptRepo.countSendsByUserId(eq(42L), anyCollection())).thenReturn(0L);
        when(attemptRepo.countSendsByUserIdAndLoggedAtBetween(eq(42L), anyCollection(), any(), any()))
                .thenReturn(0L);
        when(attemptRepo.findTopGradeValueByUserId(eq(42L), anyCollection()))
                .thenReturn(Optional.empty());

        MeStatsView view = service.getStats(42L, KST);

        assertThat(view.weekSessions()).isZero();
        assertThat(view.weekSends()).isZero();
        assertThat(view.totalSessions()).isZero();
        assertThat(view.totalSends()).isZero();
        assertThat(view.topGrade()).isNull();
        assertThat(view.weekStart()).isEqualTo(EXPECTED_WEEK_START);
        assertThat(view.weekEnd()).isEqualTo(EXPECTED_WEEK_END);
    }

    @Test
    void getStats_aggregatesFromRepos() {
        when(sessionRepo.countByUserIdAndDeletedAtIsNull(7L)).thenReturn(87L);
        when(sessionRepo.countByUserIdAndDeletedAtIsNullAndStartedAtBetween(eq(7L), any(), any()))
                .thenReturn(3L);
        when(attemptRepo.countSendsByUserId(eq(7L), anyCollection())).thenReturn(412L);
        when(attemptRepo.countSendsByUserIdAndLoggedAtBetween(eq(7L), anyCollection(), any(), any()))
                .thenReturn(14L);
        when(attemptRepo.findTopGradeValueByUserId(eq(7L), anyCollection()))
                .thenReturn(Optional.of("V6"));

        MeStatsView view = service.getStats(7L, KST);

        assertThat(view.weekSessions()).isEqualTo(3);
        assertThat(view.weekSends()).isEqualTo(14);
        assertThat(view.totalSessions()).isEqualTo(87L);
        assertThat(view.totalSends()).isEqualTo(412L);
        assertThat(view.topGrade()).isEqualTo("V6");
    }

    @Test
    void getStats_weekBoundaries_areMondayStartSundayEndUtc() {
        when(sessionRepo.countByUserIdAndDeletedAtIsNull(anyLong())).thenReturn(0L);
        when(attemptRepo.countSendsByUserId(anyLong(), anyCollection())).thenReturn(0L);
        when(attemptRepo.findTopGradeValueByUserId(anyLong(), anyCollection()))
                .thenReturn(Optional.empty());

        // 캡처용 응답은 0 으로 두고, 호출 시 전달된 Instant 인자만 검증
        ArgumentCaptor<Instant> fromCap = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> toCap = ArgumentCaptor.forClass(Instant.class);
        when(sessionRepo.countByUserIdAndDeletedAtIsNullAndStartedAtBetween(
                eq(42L), fromCap.capture(), toCap.capture())).thenReturn(0L);
        when(attemptRepo.countSendsByUserIdAndLoggedAtBetween(
                eq(42L), anyCollection(), any(), any())).thenReturn(0L);

        service.getStats(42L, KST);

        Instant from = fromCap.getValue();
        Instant to = toCap.getValue();
        // KST 월요일 00:00 = UTC 전 일요일 15:00
        assertThat(from).isEqualTo(Instant.parse("2026-04-19T15:00:00Z"));
        // KST 일요일 23:59:59.999999999 = UTC 14:59:59.999999999
        assertThat(to).isAfter(Instant.parse("2026-04-26T14:59:59Z"));
        assertThat(to).isBefore(Instant.parse("2026-04-26T15:00:00Z"));
    }

    @Test
    void getStats_topGrade_picksFirstFromRepoList() {
        when(sessionRepo.countByUserIdAndDeletedAtIsNull(anyLong())).thenReturn(1L);
        when(sessionRepo.countByUserIdAndDeletedAtIsNullAndStartedAtBetween(anyLong(), any(), any()))
                .thenReturn(0L);
        when(attemptRepo.countSendsByUserId(anyLong(), anyCollection())).thenReturn(1L);
        when(attemptRepo.countSendsByUserIdAndLoggedAtBetween(anyLong(), anyCollection(), any(), any()))
                .thenReturn(0L);
        when(attemptRepo.findTopGradeValueByUserId(anyLong(), anyCollection()))
                .thenReturn(Optional.of("V8"));

        MeStatsView view = service.getStats(99L, KST);
        assertThat(view.topGrade()).isEqualTo("V8");
    }

    @Test
    void getStats_passesSendFlashOnsightToAttemptRepo() {
        when(sessionRepo.countByUserIdAndDeletedAtIsNull(anyLong())).thenReturn(0L);
        when(sessionRepo.countByUserIdAndDeletedAtIsNullAndStartedAtBetween(anyLong(), any(), any()))
                .thenReturn(0L);
        when(attemptRepo.countSendsByUserId(anyLong(), anyCollection())).thenReturn(0L);
        when(attemptRepo.countSendsByUserIdAndLoggedAtBetween(anyLong(), anyCollection(), any(), any()))
                .thenReturn(0L);
        when(attemptRepo.findTopGradeValueByUserId(anyLong(), anyCollection()))
                .thenReturn(Optional.empty());

        service.getStats(1L, KST);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<AttemptResult>> resultsCap =
                ArgumentCaptor.forClass(Collection.class);
        verify(attemptRepo).countSendsByUserId(eq(1L), resultsCap.capture());
        assertThat(resultsCap.getValue())
                .containsExactlyInAnyOrder(
                        AttemptResult.SEND, AttemptResult.FLASH, AttemptResult.ONSIGHT);
    }
}

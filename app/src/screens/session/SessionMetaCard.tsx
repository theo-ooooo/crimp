import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { BigStat } from '@/components/primitives';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  shadow,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { Session } from '@/lib/schemas/session';

/**
 * 세션 상단 메타 카드.
 *
 * - 경과 시간을 HH:MM:SS 로 1초 단위 라이브 틱. 종료된 세션은 durationMin 으로 고정 렌더.
 * - BigStat(lg) 사용. 숫자 `fontVariant: tabular-nums` (iOS) 로 고정폭 보장.
 * - 카드는 테두리 없이 `theme.subtle` + `shadow.xs`.
 */
export type SessionMetaCardProps = {
  session: Session;
};

const TABULAR_NUMS = Platform.select<Array<'tabular-nums'>>({
  ios: ['tabular-nums'],
  android: [],
  default: [],
}) as Array<'tabular-nums'>;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatElapsed(startIso: string, endIso: string | null, nowMs: number): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : nowMs;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return '00:00:00';
  }
  const totalSec = Math.floor((end - start) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatStart(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export function SessionMetaCard({ session }: SessionMetaCardProps): JSX.Element {
  const theme = useTokens();
  const ended = Boolean(session.endedAt);

  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (ended) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ended]);

  const elapsed = useMemo(
    () => formatElapsed(session.startedAt, session.endedAt, now),
    [session.startedAt, session.endedAt, now],
  );

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const meta = session.gymNameRaw
    ? `${session.gymNameRaw} · ${formatStart(session.startedAt)}`
    : formatStart(session.startedAt);

  return (
    <View style={styles.card}>
      <Text style={styles.caption} numberOfLines={1}>
        {meta}
      </Text>
      {/*
        I6: BigStat 은 label 이 값 "위"에 오는 2단 레이아웃이라
        "caption(meta) + timer + status(badge + duration)" 3단 구성에서 재사용이 어려움.
        따라서 timer 는 display 토큰·tabular-nums 를 직접 지정하는 커스텀 렌더로 유지.
        F4: BigStat 이 label optional 을 지원하게 되면 교체 검토.
      */}
      <Text
        style={styles.timer}
        accessibilityLabel={t('session.detail.elapsedLabel')}
      >
        {elapsed}
      </Text>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: ended ? theme.chip : theme.accent.soft,
            },
          ]}
        >
          <Text
            style={[
              styles.statusLabel,
              { color: ended ? theme.text3 : theme.accent.ink },
            ]}
          >
            {ended
              ? t('session.detail.endedBadge')
              : t('session.detail.ongoingBadge')}
          </Text>
        </View>
        {session.durationMin !== null ? (
          <BigStat
            value={Math.max(0, session.durationMin)}
            unit={t('session.detail.minutesUnit')}
            label={t('session.detail.labelDuration')}
            scale="sm"
          />
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[5],
      gap: space[3],
      ...shadow.xs,
    },
    caption: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.13,
    },
    timer: {
      fontFamily,
      fontSize: fontSize.display,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.display,
      lineHeight: fontSize.display * 0.95,
      fontVariant: TABULAR_NUMS,
      includeFontPadding: false,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: space[3],
    },
    statusBadge: {
      paddingHorizontal: space[3],
      paddingVertical: space[1],
      borderRadius: radius.full,
      alignSelf: 'flex-start',
    },
    statusLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.bold,
      letterSpacing: -0.12,
    },
  });
}

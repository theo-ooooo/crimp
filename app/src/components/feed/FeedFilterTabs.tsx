import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/primitives';
import { t } from '@/lib/i18n';
import { space } from '@/lib/tokens';
import { FEED_FILTERS, type FeedFilter } from '@/lib/schemas/feed';

/**
 * 피드 상단 필터 칩 (가로 스크롤).
 *
 * 모크: 친구 / 인기 / 내 암장. 활성 칩은 `Chip.active` 로 시각적·접근성(selected) 동시 표기.
 * 라벨은 i18n `feed.filter.*` 에서 가져온다.
 */

export type FeedFilterTabsProps = {
  value: FeedFilter;
  onChange: (filter: FeedFilter) => void;
};

const labelKeyMap: Record<FeedFilter, 'feed.filter.friends' | 'feed.filter.popular' | 'feed.filter.myGym'> = {
  friends: 'feed.filter.friends',
  popular: 'feed.filter.popular',
  'my-gym': 'feed.filter.myGym',
};

export function FeedFilterTabs({
  value,
  onChange,
}: FeedFilterTabsProps): JSX.Element {
  const styles = useMemo(() => makeStyles(), []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      // 후속 화면에서 검색 입력 등 keyboard 활성 상태로 진입할 가능성에 대비해
      // 'handled' 로 두면 Chip 탭이 keyboard dismiss 없이 즉시 동작한다.
      keyboardShouldPersistTaps="handled"
    >
      {FEED_FILTERS.map((filter) => {
        const active = filter === value;
        return (
          <Chip
            key={filter}
            label={t(labelKeyMap[filter])}
            active={active}
            // 활성 탭도 onPress 를 그대로 전달해 Chip 이 disabled 로 보이지 않게 한다.
            // 같은 필터 재선택은 onChange 가 swallow (no-op).
            onPress={() => {
              if (!active) {
                onChange(filter);
              }
            }}
          />
        );
      })}
    </ScrollView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6, // 모크 정확값
      paddingHorizontal: space[5],
      paddingBottom: space[2],
    },
  });
}

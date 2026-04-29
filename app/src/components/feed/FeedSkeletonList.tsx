import React, { useMemo } from 'react';
import { View } from 'react-native';

import { Skeleton } from '@/components/common/primitives';
import { useTokens } from '@/lib/useTokens';

import { makeFeedStyles } from './feedScreenStyles';

export function FeedSkeletonList(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeFeedStyles(theme), [theme]);

  return (
    <View style={styles.skeletonWrap}>
      <Skeleton height={180} radius={18} />
      <Skeleton height={180} radius={18} />
      <Skeleton height={180} radius={18} />
    </View>
  );
}

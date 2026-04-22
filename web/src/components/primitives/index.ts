/**
 * Crimp 웹 프리미티브 컴포넌트 배럴.
 * 외부에서는 `@/components/primitives` 한 줄로 모두 import.
 */

export { PrimaryButton, SecondaryButton } from './Button';
export type { ButtonProps } from './Button';

export { Chip } from './Chip';
export type { ChipProps } from './Chip';

export { GradeBadge } from './GradeBadge';
export type { GradeBadgeProps, GradeBadgeSize } from './GradeBadge';

export { ResultMark } from './ResultMark';
export type { ResultMarkProps, ResultKind } from './ResultMark';

export { HoldDot } from './HoldDot';
export type { HoldDotProps, HoldColorKey } from './HoldDot';

export { BigStat } from './BigStat';
export type { BigStatProps, BigStatScale, BigStatAlign } from './BigStat';

export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { CrimpIcon } from './Icon';
export type { IconProps, CrimpIconName } from './Icon';

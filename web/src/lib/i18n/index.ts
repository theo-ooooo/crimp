import en from './en.json';
import ko from './ko.json';

/**
 * 최소 i18n 헬퍼.
 *
 * Phase 1 에서는 번들 포함 i18next 도입 전까지 타입 안전한 lookup 유틸만 제공한다.
 * 키 누락 시 compile-time 에러, 런타임 접근 시 fallback (ko → 'en' → 키 자체) 전략.
 */
export type Locale = 'ko' | 'en';

const DEFAULT_LOCALE: Locale = 'ko';

const dictionaries = { ko, en } as const;

type Messages = typeof ko;

type LeafPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? LeafPaths<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

export type MessageKey = LeafPaths<Messages>;

function lookup(dict: unknown, path: string): string | null {
  const parts = path.split('.');
  let cursor: unknown = dict;
  for (const part of parts) {
    if (cursor && typeof cursor === 'object' && part in cursor) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return typeof cursor === 'string' ? cursor : null;
}

export function t(key: MessageKey, locale: Locale = DEFAULT_LOCALE): string {
  const primary = lookup(dictionaries[locale], key);
  if (primary !== null) return primary;
  const fallback = lookup(dictionaries[DEFAULT_LOCALE], key);
  return fallback ?? key;
}

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState, type ReactNode } from 'react';

import { useTokenStore } from '@/store/tokenStore';

/**
 * 전역 TanStack Query provider.
 *
 * - Query client 는 컴포넌트 마운트 시 1회만 생성해 Fast Refresh 간 유지.
 * - Devtools 는 개발 환경(`process.env.NODE_ENV === 'development'`)에서만 마운트.
 * - Mount 직후 token store 를 hydrate 해 localStorage 값을 클라이언트 상태에 반영.
 */
export function QueryProvider({ children }: { children: ReactNode }): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    useTokenStore.getState().hydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      ) : null}
    </QueryClientProvider>
  );
}

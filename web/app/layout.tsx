import type { Metadata, Viewport } from 'next';
import './globals.css';

import { TopNav } from '@/components/nav/TopNav';
import ko from '@/lib/i18n/ko.json';
import { QueryProvider } from '@/lib/query/QueryProvider';

// Next.js Metadata 는 서버 사이드에서 정적으로 주입되므로 i18next hook 을 못 씀.
// 현재는 기본 로캘(ko) 딕셔너리를 직접 import 해서 용어 일치 보장.
// Phase 2 다국어 라우팅 (/en) 도입 시 generateMetadata({params}) 로 로캘별 분기 예정.
export const metadata: Metadata = {
  title: ko.site.title,
  description: ko.site.description,
};

export const viewport: Viewport = {
  themeColor: '#C9F84B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        {/*
          Pretendard Variable — jsdelivr 핀된 버전. SRI 로 CDN 변조 방어.
          버전 업 시 `curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A`
          로 해시 재계산해서 integrity 값 교체.
        */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
          integrity="sha384-f9iEnfDmuRSuBrXQjpPibejnfJMrZ2yI+715EjxlzBsPFIpaD1NxMh1MIzthxtCh"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <QueryProvider>
          {/*
            TopNav 는 클라이언트 컴포넌트이며, 로그인 상태일 때만 렌더링한다.
            hydration 전 / 비로그인 / 로그인 페이지에서는 자체적으로 null 을 반환.
          */}
          <TopNav />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

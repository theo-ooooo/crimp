import type { Metadata, Viewport } from 'next';
import './globals.css';

import { BottomTabs } from '@/components/nav/BottomTabs';
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
            TopNav: 데스크탑 (md+) 전용. BottomTabs: 모바일 (md 미만) 전용.
            둘 다 클라이언트 컴포넌트, 로그인 상태일 때만 렌더링 (자체 null guard).
            (PR #108)
          */}
          <TopNav />
          {/*
            모바일 전용 하단 padding — BottomTabs 가 fixed 라 마지막 컨텐츠가 가려지지
            않도록 56px (탭 높이) + safe-area inset. 데스크탑(md+)은 BottomTabs 가
            hidden 이라 padding 0.
          */}
          <div className="pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </div>
          <BottomTabs />
        </QueryProvider>
      </body>
    </html>
  );
}

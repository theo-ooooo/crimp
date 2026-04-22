import type { Metadata, Viewport } from 'next';
import './globals.css';

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
  themeColor: '#ff7a1f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

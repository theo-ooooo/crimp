import type { Metadata, Viewport } from 'next';
import './globals.css';

import { QueryProvider } from '@/lib/query/QueryProvider';

export const metadata: Metadata = {
  title: 'Crimp — 클라이머를 위한 디지털 홈',
  description:
    '암장·루트·등반 로그·크루·아웃도어까지. 클라이머의 모든 순간을 하나로.',
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

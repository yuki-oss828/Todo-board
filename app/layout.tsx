import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '作業確認ボード',
  description: 'スタッフみんなで、開店前と締めの作業状況を共有する確認アプリ',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}

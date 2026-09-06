import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });

export const metadata: Metadata = {
  title: '仕込みボード',
  description: 'スタッフみんなで、今日の仕込みと担当を共有する作業管理アプリ',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  );
}

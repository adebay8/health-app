import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/header';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Health Dashboard',
  description: 'Aggregated health data for demo patients',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

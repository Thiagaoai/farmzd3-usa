import type { Metadata, Viewport } from 'next';
import { body, display, mono } from './fonts';
import './globals.css';

const siteUrl = process.env.FARMZ3D_SITE_URL || 'https://farmz3d.shop';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Farmz3D — Personalized 3D-Printed Gifts',
  description: 'Custom 3D-printed gifts and holiday decor, made to order by Farmz3D.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0C0E',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

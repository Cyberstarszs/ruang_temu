import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ShiftProvider } from '@/context/ShiftContext';

export const metadata: Metadata = {
  title: 'RUANG TEMU · Integrated Cafe & POS Management System',
  description: 'Point of Sale, Kitchen/Bar Checker, Inventory & Cafe Management System for RUANG TEMU.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <ShiftProvider>
            {children}
          </ShiftProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

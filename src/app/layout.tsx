import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth';

const font = Figtree({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Priya Clinical Labs Dashboard',
  description: 'Personal dashboard for tracking lab results and patient data in real time.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={font.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

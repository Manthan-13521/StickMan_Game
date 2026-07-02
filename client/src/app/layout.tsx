import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StickMan Arena',
  description: 'Real-time multiplayer Stickman fighting game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

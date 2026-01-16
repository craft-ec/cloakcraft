import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallet Transaction Test',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        {children}
      </body>
    </html>
  );
}

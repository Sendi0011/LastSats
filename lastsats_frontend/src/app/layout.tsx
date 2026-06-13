import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/lib/wallet-context';
import { Navbar, DemoBanner } from '@/components/ui';

export const metadata: Metadata = {
  title: 'LastSats — Bitcoin Inheritance Protocol',
  description: 'The first trustless Bitcoin inheritance protocol on Stacks. Protect your sats.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>"
        />
      </head>
      <body>
        <WalletProvider>
          <Navbar />
          <DemoBanner />
          <main>{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}

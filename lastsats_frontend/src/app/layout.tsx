import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/lib/wallet-context';
import { Navbar } from '@/components/ui';

export const metadata: Metadata = {
  title: 'LastSats — Bitcoin Inheritance Protocol',
  description: 'The first trustless Bitcoin inheritance protocol on Stacks. Protect your sats.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <Navbar />
          <main>{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}

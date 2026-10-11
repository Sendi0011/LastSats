import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/lib/wallet-context';
import { ThemeProvider } from '@/lib/theme-context';
import { Navbar } from '@/components/ui';

export const metadata: Metadata = {
  title: 'LastSats — Bitcoin Inheritance Protocol',
  description: 'The first trustless Bitcoin inheritance protocol on Stacks. Protect your sats.',
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <WalletProvider>
            <Navbar />
            <main>{children}</main>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

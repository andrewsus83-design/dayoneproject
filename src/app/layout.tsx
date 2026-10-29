import type { Metadata } from 'next';
import { Manrope, Outfit } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'all41 | The Ultimate Event Platform',
  description: 'Multi-tenant event experience platform for corporate summits and luxury galas across Southeast Asia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${manrope.variable} ${outfit.variable} dark scroll-smooth h-full`}
    >
      <body className="min-h-full flex flex-col bg-premium-black text-zinc-100 antialiased selection:bg-premium-gold selection:text-premium-black">
        {children}
      </body>
    </html>
  );
}

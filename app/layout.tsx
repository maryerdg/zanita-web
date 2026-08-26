import type { Metadata } from 'next';
import { Cormorant_Garamond, Birthstone, Manrope } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const birthstone = Birthstone({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-birthstone',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Zanita - Manzanas, Uvas y Charolas con Chamoy',
  description: 'Manzanas, uvas, charolas y snacks preparados con chamoy y toppings en Tijuana, B.C.',
  icons: {
    icon: '/brand/favicons/favicon-vertical-512.webp',
    shortcut: '/brand/favicons/favicon-vertical-512.webp',
    apple: '/brand/favicons/favicon-vertical-512.webp',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${birthstone.variable} ${manrope.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-[#F5EBDC] text-[#261C19] antialiased selection:bg-[#F09CA9] selection:text-[#A73832]">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

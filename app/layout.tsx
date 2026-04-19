import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth-context";
import MobileNav from '@/components/MobileNav';
import ScrollToTop from '@/components/ScrollToTop';
import { ToastProvider } from '@/components/Toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: '網球平台 — 香港網球場預約系統',
    template: '%s | 網球平台',
  },
  description: '香港多個網球會一站式預約平台。球場預約、課程報名、會籍管理，一個帳戶搞定。',
  keywords: ['網球', '網球場', '預約', '香港', '網球課程', 'tennis', 'booking', 'court', 'Hong Kong'],
  openGraph: {
    type: 'website',
    locale: 'zh_HK',
    siteName: '網球平台',
    title: '網球平台 — 香港網球場預約系統',
    description: '香港多個網球會一站式預約平台',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#FFF8F0] scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#FFF8F0]">
        <AuthProvider>
          <Header />
          <ToastProvider><main className="flex-1 pb-16 md:pb-0">{children}</main></ToastProvider>
          <Footer />
          <MobileNav />
          <ScrollToTop />
        </AuthProvider>
              <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
        `}} />
      </body>
    </html>
  );
}

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
  title: "TENNIS CLUB",
  description: "Book tennis classes and courts at our premium tennis club",
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
            navigator.serviceWorker.register('/tennis-booking/sw.js');
          }
        `}} />
      </body>
    </html>
  );
}

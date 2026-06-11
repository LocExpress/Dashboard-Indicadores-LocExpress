import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-KJFNN080XE";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "Dashboard LocExpress Franchising",
  description: "Dashboard de Indicadores | LocExpress Franchising — Nosso DNA é locação!",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider signInUrl="/sign-in" signInFallbackRedirectUrl="/" afterSignOutUrl="/sign-in">
      <html lang="pt-BR" className={inter.variable}>
        <body>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}</Script>
          <div style={{ position: "fixed", top: 14, right: 18, zIndex: 50 }}>
            <UserButton />
          </div>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

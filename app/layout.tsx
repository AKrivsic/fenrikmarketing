import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AnalyticsConsentBanner } from "@/components/analytics/AnalyticsConsentBanner";
import { AnalyticsConsentProvider } from "@/components/analytics/AnalyticsConsentProvider";
import { FirstTouchAttributionCapture } from "@/components/analytics/FirstTouchAttributionCapture";
import { GoogleAnalyticsProvider } from "@/components/analytics/GoogleAnalyticsProvider";
import { MetaPixelProvider } from "@/components/analytics/MetaPixelProvider";
import { AppShell } from "@/components/AppShell/AppShell";

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
    default: "Fenrik Studio",
    template: "%s | Fenrik Studio",
  },
  description:
    "Send us your website and get a free sample content package with ready-to-post videos and social posts.",
  icons: {
    icon: "/fenrik-logo.webp",
    apple: "/fenrik-logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AnalyticsConsentProvider>
          <FirstTouchAttributionCapture />
          <AppShell>{children}</AppShell>
          <GoogleAnalyticsProvider />
          <MetaPixelProvider />
          <AnalyticsConsentBanner />
        </AnalyticsConsentProvider>
      </body>
    </html>
  );
}

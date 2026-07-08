import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalyticsProvider } from "@/components/analytics/GoogleAnalyticsProvider";
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
        <AppShell>{children}</AppShell>
        <GoogleAnalyticsProvider />
      </body>
    </html>
  );
}

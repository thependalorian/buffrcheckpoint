import { Archivo, Geist, Geist_Mono } from "next/font/google";

import type { Metadata } from "next";

import { AnalyticsProviders } from "@/components/analytics/AnalyticsProviders";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://buffrcheckpoint.com"),
  title: {
    default: "Checkpoint: Secure Visitor Check-In",
    template: "%s | Checkpoint",
  },
  description:
    "A paper visitor register shows every name, phone number, and ID number to the next person who signs. Checkpoint gives each visitor a private, encrypted record, keeps working offline, and checks in people with or without a smartphone.",
  openGraph: {
    type: "website",
    locale: "en_NA",
    url: "https://buffrcheckpoint.com",
    siteName: "Checkpoint",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Checkpoint",
    description: "Secure, inclusive visitor check-in for Africa's regulated organisations.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  robots: { index: true, follow: true },
  // Google Search Console: set this to the verification code it shows, then the domain is claimed without a DNS change.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme-preset="buffr-checkpoint"
      className={`${archivo.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <AnalyticsProviders>
          <TooltipProvider>
            <div className="flex min-h-full flex-1 flex-col">{children}</div>
            <Toaster />
          </TooltipProvider>
        </AnalyticsProviders>
      </body>
    </html>
  );
}

import { Archivo, Geist, Geist_Mono } from "next/font/google";

import type { Metadata } from "next";

import { AnalyticsProviders } from "@/components/analytics/AnalyticsProviders";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

// Variable names must match what src/styles/presets/buffr-checkpoint.css
// references (--font-archivo, --font-geist, --font-geist-mono) — this is
// the same fix applied in admin/src/lib/fonts/registry.ts, where
// --font-archivo was previously never loaded anywhere.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["100", "300", "400"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Buffr Checkpoint: Secure Visitor Check-In",
    template: "%s | Buffr Checkpoint",
  },
  description:
    "Buffr Checkpoint is a Namibia-built digital visitor and access-management platform. Replace paper registers with isolated records, risk-based controls, and offline-first operation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme-preset="buffr-checkpoint"
      className={`${archivo.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AnalyticsProviders>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </AnalyticsProviders>
      </body>
    </html>
  );
}

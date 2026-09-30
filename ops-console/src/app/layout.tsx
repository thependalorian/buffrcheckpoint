import type { ReactNode } from "react";

import type { Metadata } from "next";

import { AnalyticsProviders } from "@/components/analytics/AnalyticsProviders";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

export const metadata: Metadata = {
  title: "Checkpoint: Platform Ops Console",
  description: "Internal Checkpoint operations console. Never customer-facing.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme-preset="buffr-checkpoint" data-theme-mode="light" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
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

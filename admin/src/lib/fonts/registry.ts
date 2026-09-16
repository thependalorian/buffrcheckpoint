import { Archivo, Geist, Geist_Mono } from "next/font/google";

// Section 11.5.2: the design system uses exactly three fixed font
// families — Archivo (headings), Geist (UI/body), Geist Mono (technical
// labels) — none of them user-switchable (Section 11.5's dark-only,
// fixed-typography decision; the font-switcher UI that used to sit on top
// of this registry has been removed, see layout-controls.tsx).
//
// This file used to load 17 Google Font families for that now-removed
// switcher. Loading all of them at dev-server boot was the actual cause of
// repeated "Module not found: @vercel/turbopack-next/internal/font/google/font"
// crashes on localhost:3000 (Turbopack's Google Fonts fetch failing for
// whichever family happened to resolve last) — trimming this list to only
// the 3 fonts the product design actually specifies removes that failure
// surface entirely, rather than working around it with retries.

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["100", "300", "400"],
  variable: "--font-archivo",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const fontVars = [archivo.variable, geist.variable, geistMono.variable].join(" ");

import { Archivo, Geist, Geist_Mono } from "next/font/google";

// Archivo (headings), Geist (UI and body) and Geist Mono (technical labels): the three fixed Checkpoint families,
// exposed as CSS variables on <html> so the preset's --font-heading, --font-sans and --font-mono resolve everywhere.
const archivo = Archivo({ subsets: ["latin"], weight: ["100", "300", "400"], variable: "--font-archivo" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const fontVars = [archivo.variable, geist.variable, geistMono.variable].join(" ");

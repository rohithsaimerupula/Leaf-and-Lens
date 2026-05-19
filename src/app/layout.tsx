import type { Metadata } from "next";
import { Inter, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leaf & Lens 2026 — Vignan's Institute of Information Technology",
  description: "Official portal for Leaf & Lens 2026, a World Environment Day competition themed 'Green Leaf Pockets'. Organized by Vignan's Institute of Information Technology (VIIT).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-dark text-slate-100 selection:bg-neon selection:text-black">
        {children}
      </body>
    </html>
  );
}

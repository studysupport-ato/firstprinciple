import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
  // Newsreader optical sizing makes it perfect for editorial interfaces
});

export const metadata: Metadata = {
  title: "First Principles | University Mathematics",
  description: "A premium interactive university learning platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <body className="antialiased selection:bg-blue-100 selection:text-black">
        {children}
      </body>
    </html>
  );
}

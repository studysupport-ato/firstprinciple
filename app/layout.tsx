import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
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
  title: "B2BwKwamina | University Mathematics",
  applicationName: "B2BwKwamina",
  description: "A premium interactive university learning platform.",
  appleWebApp: { title: "B2BwKwamina" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <body className="antialiased selection:bg-[#F8DFC2] selection:text-black">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

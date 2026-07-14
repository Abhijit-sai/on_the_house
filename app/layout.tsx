import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "On the House",
  description: "A private offline game-night tracker and settlement helper.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#070707",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      {/* suppressHydrationWarning: browser extensions (Grammarly, Scribe, …) inject
          attributes on <html>/<body> before React hydrates; only these two nodes are exempt. */}
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className={`${geist.variable} font-sans antialiased`} suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  // Absolute base for link-preview and canonical URLs. games.madsoul.in is the
  // canonical domain, so pin it in production regardless of any env var; only
  // local dev falls back to localhost.
  metadataBase: new URL(
    process.env.NODE_ENV === "production"
      ? "https://games.madsoul.in"
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  ),
  title: { default: "On the House", template: "%s · On the House" },
  description: "Host the night, settle the chaos. House party games for your crew.",
  openGraph: { type: "website", siteName: "On the House" },
  twitter: { card: "summary_large_image" },
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
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
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

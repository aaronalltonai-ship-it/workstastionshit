import type { Metadata } from "next";
import "./globals.css";
import RootShell from "@/components/RootShell";

export const metadata: Metadata = {
  title: "Nebula AI Studio",
  description: "Build AI tools, custom GPTs, music, and video in one place.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nebula AI Studio",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#0b1120",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}

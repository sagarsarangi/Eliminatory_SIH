import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "MooSense",
    template: "%s | MooSense",
  },
  description: "AI-powered bovine mastitis forecasting — detect subclinical mastitis 7–14 days before clinical symptoms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  EB_Garamond,
  Barlow_Condensed,
} from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "./sw-register";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FARÉ — Vintage Operator OS",
  description:
    "Past, present, future — one piece at a time. The vintage operator's brain.",
  applicationName: "FARÉ",
  appleWebApp: {
    capable: true,
    title: "FARÉ",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0d0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${ebGaramond.variable} ${barlowCondensed.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

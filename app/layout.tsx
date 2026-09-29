import type { Metadata } from "next";
import { Manrope, Source_Sans_3 } from "next/font/google";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const display = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Himalayan 4x4 & motorbike expeditions",
    template: "%s · Ice Age Expeditions",
  },
  description:
    "Ice Age Expeditions runs guided Himalayan journeys by 4x4 SUV and motorbike. Dated departures, support vehicles, and itineraries paced for altitude.",
  applicationName: "Ice Age Expeditions",
  openGraph: {
    siteName: "Ice Age Expeditions",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/imagery/alpine-convoy.svg",
        alt: "High Himalayan road at dawn, pine slopes under a glacier",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}

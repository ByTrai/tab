import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist_Mono, Nunito_Sans, Outfit } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Tabby — save, close, and resume without the tab clutter",
  description:
    "Tabby is a local-first workspace for links, notes, and tasks. Park what matters on this device, clear the browser, and come back clear. No account required to start.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Tabby",
    description:
      "Local-first workspace for saving, closing, and resuming browser work — private by default.",
    type: "website",
  },
};

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${outfit.variable} ${geistMono.variable}`}
    >
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}

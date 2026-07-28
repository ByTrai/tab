import "~/styles/globals.css";

import { type Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";

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

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${ibmPlexSans.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}

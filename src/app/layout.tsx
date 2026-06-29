import type { Metadata } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

const siteUrl =
  process.env.AUTH_URL ?? "https://gaba-rapport.nikolevski-consulting.ch";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "GA BA Regieberichte",
  description: "Regieberichte Gandola & Battaini AG",
  applicationName: "GA BA Regie",
  appleWebApp: {
    capable: true,
    title: "GA BA Regie",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "GA BA Regieberichte",
    description: "Regieberichte Gandola & Battaini AG",
    siteName: "GA BA Regieberichte",
    images: [{ url: "/og.png", width: 512, height: 512, alt: "GA BA" }],
    type: "website",
  },
};

export const viewport = {
  themeColor: "#1a2a8f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}

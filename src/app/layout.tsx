import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GA BA Regieberichte",
  description: "Regieberichte Gandola & Battaini AG",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aqua Command | System Control",
  description: "Authenticated control interface for the Smart Aqua Manage system.",
};

export const viewport: Viewport = {
  themeColor: "#07110f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

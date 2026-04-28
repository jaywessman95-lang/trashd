import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trashd",
  description: "AI lead finder for junk removal companies."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

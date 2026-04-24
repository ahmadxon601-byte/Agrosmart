import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Dehqon Assistant",
  description: "Tuproq, hudud va ob-havo asosida dehqonlar uchun oddiy AI yordamchi."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}

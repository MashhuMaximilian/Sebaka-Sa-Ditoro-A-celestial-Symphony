import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Sebaka sa Ditoro — The Observatory",
  description:
    "Stand beneath the twin suns of Sebaka. Explore a living sky, its worlds, and the stories they leave behind.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

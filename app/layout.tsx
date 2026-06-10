import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font",
});

export const metadata: Metadata = {
  title: "AutoRe — AI Review Management for Google Business Profile",
  description:
    "AutoRe automatically replies to your Google Business Profile reviews using AI, alerts you to negative reviews via email, and sends monthly SEO reports.",
  keywords: "google reviews, review management, AI replies, local SEO, google business profile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-black antialiased">
        {children}
      </body>
    </html>
  );
}

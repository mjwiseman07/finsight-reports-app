import type { Metadata } from "next";
import { Geologica, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Advisacor | AI Powered Financial Intelligence",
  description:
    "Advisacor is an AI-powered enterprise financial intelligence platform built for operational analytics, forecasting, advisory insights, and executive reporting.",
  metadataBase: new URL("https://advisacor.com"),
  openGraph: {
    title: "Advisacor | AI Powered Financial Intelligence",
    description:
      "AI-powered enterprise financial intelligence for operational analytics, forecasting, advisory insights, and executive reporting.",
    url: "https://advisacor.com",
    siteName: "Advisacor",
    images: [
      {
        url: "/advisacor-logo.svg",
        width: 1200,
        height: 630,
        alt: "Advisacor Financial Intelligence",
      },
    ],
    type: "website",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geologica.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}

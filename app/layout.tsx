import type { Metadata } from "next";
import { Inter, Roboto_Mono, Roboto_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const robotoSerif = Roboto_Serif({ subsets: ["latin"], variable: "--font-roboto-serif" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-roboto-mono" });

export const metadata: Metadata = {
  title: "Sovereign AI Fraud Copilot | Malaysia XX Bank",
  description: "Fraud scored inside Teradata, explained by a RAG copilot grounded in the bank's fraud SOP.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoSerif.variable} ${robotoMono.variable} h-full`}>
      <head>
        {/* Landing-page display and body faces (Clash Display, Satoshi) from Fontshare. */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@500,700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Meeting Notes",
  description: "Record a meeting and get a written summary",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable} ${body.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}

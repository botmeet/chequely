import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalAccountProvider } from "@/components/navigation/global-account-context";
import { AppShell } from "@/components/navigation/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chequely — Personal Cheque and Bill Tracker",
  description: "Personal web app for recording cheques and bills, tracking lifecycles, and managing receivables/payables",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <GlobalAccountProvider>
          <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </GlobalAccountProvider>
      </body>
    </html>
  );
}

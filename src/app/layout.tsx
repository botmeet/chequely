import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-context";
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
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const mode = localStorage.getItem('chequely-theme-mode') || 'system';
                const color = localStorage.getItem('chequely-theme-color') || 'lavender';
                const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme-color', color);
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <GlobalAccountProvider>
            <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />}>
              <AppShell>{children}</AppShell>
            </Suspense>
          </GlobalAccountProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

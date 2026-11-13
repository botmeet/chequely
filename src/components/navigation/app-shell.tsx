"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  Users,
  MoreHorizontal,
  Landmark,
  FileSpreadsheet,
  Settings,
  LogOut,
  ChevronDown,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalAccount } from "@/components/navigation/global-account-context";
import { QuickAddDialog } from "@/components/forms/quick-add-dialog";
import { PixelThemeSettings } from "@/components/theme/pixel-theme-settings";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedAccountId, setSelectedAccountId, accounts } = useGlobalAccount();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Check if current route is an auth route
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");

  if (isAuthPage) {
    return (
      <main className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950">
        <div className="flex-1 flex items-center justify-center">
          {children}
        </div>
        <footer className="py-6 px-4 text-center text-xs text-zinc-500 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <span>Chequely &bull; Made with passion by</span>
            <a
              href="https://www.linkedin.com/in/meet-hirpara/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-xs bg-zinc-200/70 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:text-primary dark:hover:text-primary transition-all shadow-xs border border-zinc-300/60 dark:border-zinc-700/80 hover:scale-105 active:scale-95"
            >
              <svg className="h-3.5 w-3.5 fill-current text-[#0a66c2]" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.8v8.37h-2.8V10.9M7.86 6.54a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26Z" />
              </svg>
              <span>Meet Hirpara</span>
            </a>
          </p>
        </footer>
      </main>
    );
  }

  const handleSignOutClick = () => {
    setShowLogoutDialog(true);
  };

  const executeSignOut = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setShowLogoutDialog(false);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Cheques", href: "/cheques", icon: CreditCard },
    { label: "Bills", href: "/bills", icon: Receipt },
    { label: "Parties", href: "/parties", icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg text-primary group">
              <div className="relative h-9 w-9 rounded-xl overflow-hidden shadow-sm ring-1 ring-zinc-200/60 dark:ring-zinc-800 bg-zinc-950 flex items-center justify-center transition-transform group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="Chequely Logo"
                  width={36}
                  height={36}
                  className="object-cover h-full w-full"
                  priority
                />
              </div>
              <span className="hidden sm:inline font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                Chequely
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/accounts"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/accounts")
                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Landmark className="h-4 w-4" />
                Bank Accounts
              </Link>
              <Link
                href="/reports"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/reports")
                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Reports
              </Link>
            </nav>
          </div>

          {/* Right Header: Global Bank Account Selector (BA-5) + User */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1">
              <Landmark className="h-3.5 w-3.5 text-zinc-500" />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
                aria-label="Filter by bank account"
              >
                <option value="all">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id.toString()}>
                    {acc.nickname} (..{acc.last_four_digits})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowThemeModal(true)}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              title="AOSP Theme & Mode"
            >
              <Palette className="h-4 w-4 text-primary" />
            </button>

            <Link
              href="/settings"
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>

            <button
              onClick={handleSignOutClick}
              className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (padding bottom for mobile bottom navigation) */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pb-24 md:pb-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 text-center text-xs text-zinc-500 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xs mb-16 md:mb-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <div className="relative h-5 w-5 rounded-md overflow-hidden bg-zinc-950 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Chequely logo"
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Chequely</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 flex-wrap justify-center">
            <span>Made with passion by</span>
            <a
              href="https://www.linkedin.com/in/meet-hirpara/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:text-primary dark:hover:text-primary shadow-xs transition-all border border-zinc-200 dark:border-zinc-700/80 hover:scale-105 active:scale-95"
            >
              <svg className="h-3.5 w-3.5 fill-current text-[#0a66c2]" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.8v8.37h-2.8V10.9M7.86 6.54a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26Z" />
              </svg>
              <span>Meet Hirpara</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Floating Add Button */}
      <QuickAddDialog />

      {/* Mobile Bottom Navigation Bar (PRD Section 10: Dashboard, Cheques, Bills, Parties, More) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg min-w-[56px] text-[11px] font-medium transition-colors",
                active
                  ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-0.5", active && "stroke-[2.5]")} />
              {item.label}
            </Link>
          );
        })}

        {/* More Menu Trigger */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 rounded-lg min-w-[56px] text-[11px] font-medium transition-colors cursor-pointer",
            showMoreMenu || pathname.startsWith("/accounts") || pathname.startsWith("/reports") || pathname.startsWith("/settings")
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-zinc-500 dark:text-zinc-400"
          )}
        >
          <MoreHorizontal className="h-5 w-5 mb-0.5" />
          More
        </button>
      </nav>

      {/* Mobile More Drawer */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-t-2xl p-5 border-t border-zinc-200 dark:border-zinc-800 shadow-xl space-y-2 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-xs uppercase tracking-wider text-zinc-400 px-3 py-1">
              More Menu
            </h3>
            <Link
              href="/accounts"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
            >
              <Landmark className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Bank Accounts
            </Link>
            <Link
              href="/reports"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
            >
              <FileSpreadsheet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Reports & Ledger
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowMoreMenu(false);
                setShowThemeModal(true);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium cursor-pointer text-left"
            >
              <Palette className="h-5 w-5 text-primary" />
              Theme & Style (AOSP Colors)
            </button>
            <Link
              href="/settings"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
            >
              <Settings className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              Settings & Profile
            </Link>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  handleSignOutClick();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Theme Modal */}
      <Dialog open={showThemeModal} onOpenChange={setShowThemeModal}>
        <DialogContent className="max-w-lg p-0 border-0 bg-transparent shadow-2xl">
          <PixelThemeSettings />
        </DialogContent>
      </Dialog>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <LogOut className="h-6 w-6 stroke-[2.2]" />
            </div>
            <DialogTitle className="text-xl font-bold">Sign Out</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 mt-1">
              Are you sure you want to sign out of your Chequely account?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              disabled={loggingOut}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={executeSignOut}
              disabled={loggingOut}
              className="w-full sm:w-auto gap-1.5"
            >
              {loggingOut ? "Signing out..." : "Yes, Sign Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


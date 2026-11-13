"use client";

import React, { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalAccount } from "@/components/navigation/global-account-context";
import { QuickAddDialog } from "@/components/forms/quick-add-dialog";
import { createClient } from "@/lib/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedAccountId, setSelectedAccountId, accounts } = useGlobalAccount();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Check if current route is an auth route
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");

  if (isAuthPage) {
    return <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">{children}</main>;
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
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
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-indigo-600 dark:text-indigo-400">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-sm">
                C
              </div>
              <span className="hidden sm:inline">Chequely</span>
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

            <Link
              href="/settings"
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
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
                  handleSignOut();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


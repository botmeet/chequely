"use client";

import React, { useState } from "react";
import { Plus, ArrowDownLeft, ArrowUpRight, Receipt, X } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function QuickAddDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Add Button for Mobile and Desktop */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 sm:bottom-8 sm:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/20 cursor-pointer"
        aria-label="Add new transaction"
      >
        <Plus className="h-7 w-7 stroke-[2.5]" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-lg">Quick Action</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <Link
              href="/cheques/new?direction=received"
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                <ArrowDownLeft className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Cheque Received</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Record a payment from customer</p>
              </div>
            </Link>

            <Link
              href="/cheques/new?direction=issued"
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                <ArrowUpRight className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Cheque Issued</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Issue cheque to vendor / supplier</p>
              </div>
            </Link>

            <Link
              href="/bills/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">New Bill</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Record sale or purchase bill</p>
              </div>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


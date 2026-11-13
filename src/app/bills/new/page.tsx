"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Receipt, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Direction } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { toInputDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { PartySelect } from "@/components/forms/party-select";

export default function NewBillPage() {
  const router = useRouter();

  const [direction, setDirection] = useState<Direction>("sale");
  const [partyId, setPartyId] = useState<number | null>(null);
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(toInputDate(new Date()));
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!partyId) {
      setError("Please select a party for this bill");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid bill amount greater than 0");
      return;
    }

    if (!billNumber.trim()) {
      setError("Please enter a bill / invoice number");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // Check BL-2: Duplicate bill number for same party and direction
      const { data: existing } = await supabase
        .from("bills")
        .select("id")
        .eq("party_id", partyId)
        .eq("direction", direction)
        .eq("bill_number", billNumber.trim())
        .eq("is_deleted", false)
        .maybeSingle();

      if (existing) {
        throw new Error(
          `Bill number "${billNumber.trim()}" already exists for this party and direction`
        );
      }

      const { data, error: insertError } = await supabase
        .from("bills")
        .insert([
          {
            user_id: user.id,
            party_id: partyId,
            direction,
            bill_number: billNumber.trim(),
            bill_date: billDate,
            due_date: dueDate || null,
            amount: numAmount,
            notes: notes.trim() || null,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      router.push(`/bills/${data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create bill");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bills">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record New Bill</h1>
          <p className="text-sm text-zinc-500">
            Sale invoices (money owed to you) or Purchase bills (money you owe)
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Bill Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Direction Selection: Sale vs Purchase */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bill Direction *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection("sale")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    direction === "sale"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                  Sale (Receivable / Money owed to me)
                </button>

                <button
                  type="button"
                  onClick={() => setDirection("purchase")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    direction === "purchase"
                      ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4 text-amber-600" />
                  Purchase (Payable / Money I owe)
                </button>
              </div>
            </div>

            {/* Party Select with inline add (PT-2) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {direction === "sale" ? "Customer *" : "Supplier / Vendor *"}
              </label>
              <PartySelect
                value={partyId}
                onChange={setPartyId}
                filterType={direction === "sale" ? "customer" : "supplier"}
                placeholder={direction === "sale" ? "Search or select customer..." : "Search or select supplier..."}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bill / Invoice Number *</label>
                <Input
                  required
                  placeholder="e.g. INV-2026-001"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bill Amount (₹) *</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bill Date *</label>
                <Input
                  required
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Due Date (Optional)</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes / Particulars</label>
              <Input
                placeholder="Goods description, reference number, or terms"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 p-4">
            <Link href="/bills">
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Bill"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


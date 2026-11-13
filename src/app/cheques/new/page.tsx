"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  AlertCircle,
  Receipt,
} from "lucide-react";
import {
  ChequeDirection,
  PayeeType,
  BankAccount,
  BillStatusView,
} from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatINR, toInputDate, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { PartySelect } from "@/components/forms/party-select";
import { useGlobalAccount } from "@/components/navigation/global-account-context";

function NewChequeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDirection = (searchParams.get("direction") as ChequeDirection) || "received";
  const initialParty = searchParams.get("party_id");

  const { accounts } = useGlobalAccount();

  const [direction, setDirection] = useState<ChequeDirection>(initialDirection);
  const [partyId, setPartyId] = useState<number | null>(
    initialParty ? parseInt(initialParty) : null
  );
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState(toInputDate(new Date()));
  const [amount, setAmount] = useState("");
  const [payerBank, setPayerBank] = useState("");
  const [payerBranch, setPayerBranch] = useState("");
  const [payeeType, setPayeeType] = useState<PayeeType>("account_payee");
  const [isPostDated, setIsPostDated] = useState(false);
  const [depositDate, setDepositDate] = useState("");
  const [remarks, setRemarks] = useState("");

  // Bill Linking (LK-1, LK-2, LK-3)
  const [unpaidBills, setUnpaidBills] = useState<BillStatusView[]>([]);
  const [selectedBillLinks, setSelectedBillLinks] = useState<
    Array<{ billId: number; amountApplied: number }>
  >([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select default bank account if issued
  useEffect(() => {
    if (direction === "issued" && !bankAccountId && accounts.length > 0) {
      const defaultAcc = accounts.find((a) => a.is_default) || accounts[0];
      if (defaultAcc) setBankAccountId(defaultAcc.id.toString());
    }
  }, [direction, accounts, bankAccountId]);

  // Fetch unpaid bills when party changes or direction changes
  useEffect(() => {
    if (!partyId) {
      setUnpaidBills([]);
      setSelectedBillLinks([]);
      return;
    }

    const fetchPartyBills = async () => {
      try {
        const supabase = createClient();
        // If received cheque: pays sale bills
        // If issued cheque: pays purchase bills
        const targetBillDirection = direction === "received" ? "sale" : "purchase";

        const { data } = await supabase
          .from("bill_status")
          .select("*")
          .eq("party_id", partyId)
          .eq("direction", targetBillDirection)
          .eq("is_deleted", false)
          .gt("unpaid_amount", 0)
          .order("bill_date", { ascending: true });

        if (data) {
          setUnpaidBills(data as BillStatusView[]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchPartyBills();
  }, [partyId, direction]);

  const totalApplied = selectedBillLinks.reduce((sum, item) => sum + item.amountApplied, 0);
  const chequeAmountNum = parseFloat(amount) || 0;

  const handleAddBillLink = (bill: BillStatusView) => {
    if (selectedBillLinks.some((l) => l.billId === bill.bill_id)) return;

    // Remaining capacity on cheque
    const remainingChequeCapacity = Math.max(0, chequeAmountNum - totalApplied);
    const suggestedAmount = Math.min(
      bill.unpaid_amount,
      remainingChequeCapacity > 0 ? remainingChequeCapacity : bill.unpaid_amount
    );

    setSelectedBillLinks((prev) => [
      ...prev,
      { billId: bill.bill_id, amountApplied: suggestedAmount },
    ]);
  };

  const handleUpdateLinkAmount = (billId: number, val: string) => {
    const num = parseFloat(val) || 0;
    setSelectedBillLinks((prev) =>
      prev.map((item) => (item.billId === billId ? { ...item, amountApplied: num } : item))
    );
  };

  const handleRemoveBillLink = (billId: number) => {
    setSelectedBillLinks((prev) => prev.filter((item) => item.billId !== billId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!partyId) {
      setError("Please select a party");
      return;
    }

    if (!chequeNumber.trim()) {
      setError("Please enter a cheque number");
      return;
    }

    if (chequeAmountNum <= 0) {
      setError("Cheque amount must be greater than 0");
      return;
    }

    // CH-4: Issued cheques must have a bank account selected
    if (direction === "issued" && !bankAccountId) {
      setError("Issued cheques must have a bank account selected");
      return;
    }

    // Post-dated deposit date check (CH-2)
    if (isPostDated && !depositDate) {
      setError("Please enter planned deposit date for post-dated cheque");
      return;
    }

    // LK-3: The total applied across bills cannot exceed the cheque amount
    if (totalApplied > chequeAmountNum) {
      setError(
        `Total amount applied to bills (${formatINR(totalApplied)}) exceeds cheque amount (${formatINR(chequeAmountNum)})`
      );
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // CH-3: Duplicate protection check
      if (direction === "issued") {
        const { data: existingIssued } = await supabase
          .from("cheques")
          .select("id")
          .eq("bank_account_id", parseInt(bankAccountId))
          .eq("cheque_number", chequeNumber.trim())
          .eq("is_deleted", false)
          .maybeSingle();

        if (existingIssued) {
          throw new Error(
            `Duplicate: Cheque #${chequeNumber.trim()} has already been issued from this bank account.`
          );
        }
      } else {
        const { data: existingReceived } = await supabase
          .from("cheques")
          .select("id")
          .eq("party_id", partyId)
          .eq("payer_bank", payerBank.trim() || null)
          .eq("cheque_number", chequeNumber.trim())
          .eq("is_deleted", false)
          .maybeSingle();

        if (existingReceived) {
          throw new Error(
            `Duplicate: Cheque #${chequeNumber.trim()} from this party and bank already exists.`
          );
        }
      }

      // Initial status per direction (Section 7)
      const initialStatus = direction === "received" ? "received" : "issued";

      const payload = {
        user_id: user.id,
        direction,
        party_id: partyId,
        bank_account_id: bankAccountId ? parseInt(bankAccountId) : null,
        cheque_number: chequeNumber.trim(),
        cheque_date: chequeDate,
        amount: chequeAmountNum,
        payer_bank: direction === "received" ? payerBank.trim() || null : null,
        payer_branch: direction === "received" ? payerBranch.trim() || null : null,
        payee_type: payeeType,
        is_post_dated: isPostDated,
        deposit_date: isPostDated && depositDate ? depositDate : null,
        status: initialStatus,
        remarks: remarks.trim() || null,
      };

      const { data: chequeData, error: chequeError } = await supabase
        .from("cheques")
        .insert([payload])
        .select()
        .single();

      if (chequeError) throw chequeError;

      // Insert linked bills (LK-1)
      if (selectedBillLinks.length > 0 && chequeData) {
        const linkInserts = selectedBillLinks.map((link) => ({
          user_id: user.id,
          cheque_id: chequeData.id,
          bill_id: link.billId,
          amount_applied: link.amountApplied,
        }));

        const { error: linkErr } = await supabase.from("cheque_bill_links").insert(linkInserts);
        if (linkErr) throw linkErr;
      }

      router.push(`/cheques/${chequeData.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record cheque");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cheques">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {direction === "received" ? "Record Received Cheque" : "Record Issued Cheque"}
          </h1>
          <p className="text-sm text-zinc-500">
            {direction === "received"
              ? "Payment received from a customer to deposit into your bank"
              : "Payment issued to a vendor/supplier from your bank account"}
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Cheque Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Direction Selection */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Direction *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection("received")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    direction === "received"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                  Received (from Customer)
                </button>

                <button
                  type="button"
                  onClick={() => setDirection("issued")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    direction === "issued"
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4 text-indigo-600" />
                  Issued (to Vendor)
                </button>
              </div>
            </div>

            {/* Party Select (PT-2) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {direction === "received" ? "Customer (Payer) *" : "Vendor / Payee *"}
              </label>
              <PartySelect
                value={partyId}
                onChange={setPartyId}
                filterType={direction === "received" ? "customer" : "supplier"}
                placeholder={
                  direction === "received"
                    ? "Select customer who gave the cheque..."
                    : "Select vendor to whom cheque is issued..."
                }
                required
              />
            </div>

            {/* Bank Account Selection (CH-4: Required for issued) */}
            {direction === "issued" ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Drawn on My Bank Account *</label>
                <Select
                  required
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                >
                  <option value="">-- Select Bank Account --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nickname} — {a.bank_name} (..{a.last_four_digits})
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Payer&apos;s Bank</label>
                  <Input
                    placeholder="e.g. State Bank of India, HDFC"
                    value={payerBank}
                    onChange={(e) => setPayerBank(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Payer&apos;s Branch</label>
                  <Input
                    placeholder="e.g. Ring Road, Ahmedabad"
                    value={payerBranch}
                    onChange={(e) => setPayerBranch(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Cheque Number & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cheque Number *</label>
                <Input
                  required
                  inputMode="numeric"
                  placeholder="e.g. 000123"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cheque Amount (₹) *</label>
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

            {/* Date & Payee Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cheque Date *</label>
                <Input
                  required
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payee Crossing</label>
                <Select
                  value={payeeType}
                  onChange={(e) => setPayeeType(e.target.value as PayeeType)}
                >
                  <option value="account_payee">A/C Payee Only</option>
                  <option value="bearer">Bearer Cheque</option>
                </Select>
              </div>
            </div>

            {/* Post-Dated Cheque Option (CH-2) */}
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pdcCheckbox"
                  checked={isPostDated}
                  onChange={(e) => setIsPostDated(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="pdcCheckbox" className="text-sm font-medium cursor-pointer">
                  Post-Dated Cheque (PDC)
                </label>
              </div>

              {isPostDated && (
                <div className="space-y-1.5 pt-1 animate-in fade-in">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Planned Deposit Date *
                  </label>
                  <Input
                    type="date"
                    required={isPostDated}
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                  />
                  <span className="text-[11px] text-zinc-400">
                    Will trigger dashboard alerts 7 days before due date
                  </span>
                </div>
              )}
            </div>

            {/* Link to Bills Section (LK-1, LK-2, LK-3) */}
            {partyId && unpaidBills.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Link to Bills</h3>
                    <p className="text-xs text-zinc-500">Apply this cheque to unpaid bills</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500">Applied: </span>
                    <span
                      className={`text-xs font-bold ${
                        totalApplied > chequeAmountNum
                          ? "text-red-600"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatINR(totalApplied)} / {formatINR(chequeAmountNum)}
                    </span>
                  </div>
                </div>

                {/* Selected Links */}
                {selectedBillLinks.length > 0 && (
                  <div className="space-y-2">
                    {selectedBillLinks.map((link) => {
                      const bill = unpaidBills.find((b) => b.bill_id === link.billId);
                      if (!bill) return null;

                      return (
                        <div
                          key={link.billId}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs"
                        >
                          <div>
                            <span className="font-bold">Bill #{bill.bill_number}</span>
                            <span className="text-zinc-500 ml-1">
                              (Unpaid: {formatINR(bill.unpaid_amount)})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">₹</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={link.amountApplied}
                              onChange={(e) =>
                                handleUpdateLinkAmount(link.billId, e.target.value)
                              }
                              className="h-8 w-28 text-xs font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveBillLink(link.billId)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Available Bills to Link */}
                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-500">Available Unpaid Bills:</span>
                  <div className="flex flex-wrap gap-2">
                    {unpaidBills
                      .filter((b) => !selectedBillLinks.some((l) => l.billId === b.bill_id))
                      .map((b) => (
                        <button
                          key={b.bill_id}
                          type="button"
                          onClick={() => handleAddBillLink(b)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Plus className="h-3 w-3 text-indigo-600" />
                          <span>#{b.bill_number}</span>
                          <span className="text-zinc-400 font-mono">({formatINR(b.unpaid_amount)})</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Remarks / Notes</label>
              <Input
                placeholder="Reference or purpose of payment"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 p-4">
            <Link href="/cheques">
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Recording..." : "Record Cheque"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function NewChequePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading form...</div>}>
      <NewChequeForm />
    </Suspense>
  );
}


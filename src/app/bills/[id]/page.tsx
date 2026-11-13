"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Receipt,
  Plus,
  Trash2,
  Edit,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Link as LinkIcon,
} from "lucide-react";
import { BillStatusView, ChequeBillLink, Cheque, Party } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate, toInputDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface LinkedChequeItem extends ChequeBillLink {
  cheques?: Cheque & { bank_accounts?: { nickname: string } };
}

function BillDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const billId = resolvedParams.id;
  const router = useRouter();

  const [bill, setBill] = useState<BillStatusView | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [links, setLinks] = useState<LinkedChequeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Link Cheque Dialog (LK-5)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [availableCheques, setAvailableCheques] = useState<Cheque[]>([]);
  const [selectedChequeId, setSelectedChequeId] = useState<string>("");
  const [applyAmount, setApplyAmount] = useState<string>("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Edit Bill Dialog (BL-4)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editNumber, setEditNumber] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editBillDate, setEditBillDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchBillData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch from bill_status view
      const { data: bData, error: bError } = await supabase
        .from("bill_status")
        .select("*")
        .eq("bill_id", billId)
        .single();

      if (bError || !bData) {
        setBill(null);
        return;
      }

      setBill(bData as BillStatusView);

      // Fetch party
      const { data: pData } = await supabase
        .from("parties")
        .select("*")
        .eq("id", bData.party_id)
        .single();
      if (pData) setParty(pData as Party);

      // Fetch linked cheques
      const { data: linkData } = await supabase
        .from("cheque_bill_links")
        .select("*, cheques(*, bank_accounts(nickname))")
        .eq("bill_id", billId);

      if (linkData) {
        setLinks(linkData as LinkedChequeItem[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillData();
  }, [billId]);

  const openLinkChequeDialog = async () => {
    if (!bill) return;
    setLinkError(null);
    setSelectedChequeId("");
    setApplyAmount(bill.unpaid_amount > 0 ? bill.unpaid_amount.toString() : "");

    // Fetch existing active cheques for this party matching direction:
    // For a sale bill (receivable), look for received cheques
    // For a purchase bill (payable), look for issued cheques
    const targetDirection = bill.direction === "sale" ? "received" : "issued";

    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("cheques")
        .select("*")
        .eq("party_id", bill.party_id)
        .eq("direction", targetDirection)
        .eq("is_deleted", false)
        .not("status", "in", '("bounced","stopped","cancelled")')
        .order("cheque_date", { ascending: false });

      if (data) {
        setAvailableCheques(data as Cheque[]);
      }
      setIsLinkDialogOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);

    if (!selectedChequeId) {
      setLinkError("Please select a cheque");
      return;
    }

    const amt = parseFloat(applyAmount);
    if (isNaN(amt) || amt <= 0) {
      setLinkError("Please enter a valid amount to apply");
      return;
    }

    setLinking(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert into cheque_bill_links
      const { error } = await supabase.from("cheque_bill_links").insert([
        {
          user_id: user.id,
          cheque_id: parseInt(selectedChequeId),
          bill_id: parseInt(billId),
          amount_applied: amt,
        },
      ]);

      if (error) throw error;

      await fetchBillData();
      setIsLinkDialogOpen(false);
    } catch (err: unknown) {
      setLinkError(err instanceof Error ? err.message : "Failed to link cheque to bill");
    } finally {
      setLinking(false);
    }
  };

  const openEdit = () => {
    if (!bill) return;
    setEditNumber(bill.bill_number);
    setEditAmount(bill.bill_amount.toString());
    setEditBillDate(bill.bill_date);
    setEditDueDate(bill.due_date || "");
    setEditNotes(bill.notes || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill) return;
    setSavingEdit(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bills")
        .update({
          bill_number: editNumber.trim(),
          amount: parseFloat(editAmount),
          bill_date: editBillDate,
          due_date: editDueDate || null,
          notes: editNotes.trim() || null,
        })
        .eq("id", bill.bill_id);

      if (error) throw error;

      await fetchBillData();
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update bill");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bills")
        .update({ is_deleted: true })
        .eq("id", billId);

      if (error) throw error;
      router.push("/bills");
    } catch (err) {
      console.error(err);
      alert("Failed to delete bill");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-zinc-500">Loading bill details...</div>;
  }

  if (!bill) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold">Bill Not Found</h2>
        <p className="text-sm text-zinc-500 mt-1 mb-4">This bill may have been deleted or moved.</p>
        <Link href="/bills">
          <Button>Back to Bills</Button>
        </Link>
      </Card>
    );
  }

  const isSale = bill.direction === "sale";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/bills">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Bill #{bill.bill_number}</h1>
              <Badge variant={isSale ? "success" : "warning"} className="uppercase text-[11px]">
                {bill.direction}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500">{party?.name || "Party"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSoftDelete} className="text-red-600 gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Bill Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              Total Bill Amount
            </span>
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">
              {formatINR(bill.bill_amount)}
            </div>
            <span className="text-xs text-zinc-400 mt-1 block">
              Bill Date: {formatDate(bill.bill_date)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              Paid Amount
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(bill.paid_amount)}
            </div>
            <span className="text-xs text-zinc-400 mt-1 block">
              {bill.payment_status === "paid" ? "Paid in full" : `${links.length} linked payment(s)`}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              Outstanding Unpaid
            </span>
            <div
              className={`text-2xl font-bold mt-1 ${
                bill.unpaid_amount > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"
              }`}
            >
              {formatINR(bill.unpaid_amount)}
            </div>
            {bill.due_date && (
              <span className={`text-xs mt-1 block ${bill.is_overdue ? "text-red-500 font-semibold" : "text-zinc-400"}`}>
                {bill.is_overdue ? `Overdue since ${formatDate(bill.due_date)}` : `Due: ${formatDate(bill.due_date)}`}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linked Cheques Section (LK-2, LK-5) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Linked Cheque Payments</CardTitle>
            <p className="text-xs text-zinc-500">
              Cheques applied to pay this bill (many-to-many linking)
            </p>
          </div>
          <Button size="sm" onClick={openLinkChequeDialog} className="gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" />
            Link Existing Cheque
          </Button>
        </CardHeader>

        <CardContent>
          {links.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500 border border-dashed rounded-xl">
              No cheques linked to this bill yet. Click &quot;Link Existing Cheque&quot; to apply a payment.
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => {
                const cheque = link.cheques;
                if (!cheque) return null;

                return (
                  <div
                    key={link.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <Link
                          href={`/cheques/${cheque.id}`}
                          className="font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Cheque #{cheque.cheque_number}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          Total Cheque: {formatINR(cheque.amount)} • Date: {formatDate(cheque.cheque_date)}
                          {cheque.bank_accounts && ` • ${cheque.bank_accounts.nickname}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <span className="text-xs text-zinc-400">Applied to this bill</span>
                        <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                          {formatINR(link.amount_applied)}
                        </p>
                      </div>

                      <Badge variant="outline" className="capitalize text-xs">
                        {cheque.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Cheque Dialog (LK-5) */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Cheque Payment</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleLinkCheque} className="space-y-4">
            {linkError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-300">
                {linkError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Available Cheque *</label>
              {availableCheques.length === 0 ? (
                <div className="p-3 text-xs text-zinc-500 border border-dashed rounded-lg text-center">
                  No unbounced {isSale ? "received" : "issued"} cheques found for this party.
                  <div className="mt-2">
                    <Link
                      href={`/cheques/new?direction=${isSale ? "received" : "issued"}&party_id=${bill.party_id}`}
                      className="text-indigo-600 font-semibold underline"
                    >
                      Record a new cheque now
                    </Link>
                  </div>
                </div>
              ) : (
                <select
                  required
                  value={selectedChequeId}
                  onChange={(e) => {
                    setSelectedChequeId(e.target.value);
                    const ch = availableCheques.find((c) => c.id === parseInt(e.target.value));
                    if (ch) {
                      // Pre-fill amount applied to whichever is lower: cheque amount or unpaid bill amount
                      const maxAppliable = Math.min(ch.amount, bill.unpaid_amount);
                      setApplyAmount(maxAppliable > 0 ? maxAppliable.toString() : ch.amount.toString());
                    }
                  }}
                  className="flex min-h-[44px] w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose a Cheque --</option>
                  {availableCheques.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.cheque_number} — {formatINR(c.amount)} ({formatDate(c.cheque_date)}) [{c.status}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount Applied to This Bill (₹) *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={applyAmount}
                onChange={(e) => setApplyAmount(e.target.value)}
              />
              <span className="text-[11px] text-zinc-400">
                Unpaid balance on this bill is {formatINR(bill.unpaid_amount)}
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLinkDialogOpen(false)}
                disabled={linking}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={linking || availableCheques.length === 0}>
                {linking ? "Linking..." : "Apply Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog (BL-4) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bill Details</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bill Number *</label>
              <Input
                required
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bill Amount (₹) *</label>
              <Input
                type="number"
                step="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bill Date</label>
                <Input
                  type="date"
                  required
                  value={editBillDate}
                  onChange={(e) => setEditBillDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading bill...</div>}>
      <BillDetailContent params={params} />
    </React.Suspense>
  );
}

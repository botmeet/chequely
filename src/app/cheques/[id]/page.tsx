"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  Landmark,
  Trash2,
  Edit,
  History,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { addMonths, isPast, differenceInDays, parseISO } from "date-fns";
import {
  Cheque,
  ChequeStatusHistory,
  ChequeBillLink,
  Party,
  BankAccount,
} from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate, toInputDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChequeStatusBadge } from "@/components/cheques/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface LinkedBillWithDetails extends Omit<ChequeBillLink, "bills"> {
  bills?: {
    id: number;
    bill_number: string;
    amount: number;
    bill_date: string;
    direction: string;
  };
}

function ChequeDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const chequeId = resolvedParams.id;
  const router = useRouter();

  const [cheque, setCheque] = useState<Cheque | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [history, setHistory] = useState<ChequeStatusHistory[]>([]);
  const [linkedBills, setLinkedBills] = useState<LinkedBillWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State (CH-8)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editNumber, setEditNumber] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchChequeDetails = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: cData, error: cError } = await supabase
        .from("cheques")
        .select("*")
        .eq("id", chequeId)
        .single();

      if (cError || !cData) {
        setCheque(null);
        return;
      }

      setCheque(cData as Cheque);

      // Fetch party
      const { data: pData } = await supabase
        .from("parties")
        .select("*")
        .eq("id", cData.party_id)
        .single();
      if (pData) setParty(pData as Party);

      // Fetch bank account if issued
      if (cData.bank_account_id) {
        const { data: bData } = await supabase
          .from("bank_accounts")
          .select("*")
          .eq("id", cData.bank_account_id)
          .single();
        if (bData) setBankAccount(bData as BankAccount);
      }

      // Fetch status history (CH-6)
      const { data: hData } = await supabase
        .from("cheque_status_history")
        .select("*")
        .eq("cheque_id", chequeId)
        .order("changed_at", { ascending: false });
      if (hData) setHistory(hData as ChequeStatusHistory[]);

      // Fetch linked bills (LK-1)
      const { data: lData } = await supabase
        .from("cheque_bill_links")
        .select("*, bills(*)")
        .eq("cheque_id", chequeId);
      if (lData) setLinkedBills(lData as LinkedBillWithDetails[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChequeDetails();
  }, [chequeId]);

  const openEdit = () => {
    if (!cheque) return;
    setEditNumber(cheque.cheque_number);
    setEditAmount(cheque.amount.toString());
    setEditDate(cheque.cheque_date);
    setEditRemarks(cheque.remarks || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cheque) return;
    setSavingEdit(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("cheques")
        .update({
          cheque_number: editNumber.trim(),
          amount: parseFloat(editAmount),
          cheque_date: editDate,
          remarks: editRemarks.trim() || null,
        })
        .eq("id", cheque.id);

      if (error) throw error;
      await fetchChequeDetails();
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update cheque");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!confirm("Are you sure you want to move this cheque to the recycle bin?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("cheques")
        .update({ is_deleted: true })
        .eq("id", chequeId);

      if (error) throw error;
      router.push("/cheques");
    } catch (err) {
      console.error(err);
      alert("Failed to delete cheque");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-zinc-500">Loading cheque details...</div>;
  }

  if (!cheque) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold">Cheque Not Found</h2>
        <p className="text-sm text-zinc-500 mt-1 mb-4">This cheque may have been deleted.</p>
        <Link href="/cheques">
          <Button>Back to Cheques</Button>
        </Link>
      </Card>
    );
  }

  // CH-9: Cheque validity shown as cheque date plus 3 months
  const chequeDateObj = parseISO(cheque.cheque_date);
  const validityDate = addMonths(chequeDateObj, 3);
  const isExpired = isPast(validityDate) && cheque.status !== "cleared";
  const daysRemaining = differenceInDays(validityDate, new Date());

  const isReceived = cheque.direction === "received";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cheques">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Cheque #{cheque.cheque_number}</h1>
              <Badge variant={isReceived ? "success" : "default"} className="uppercase text-[11px]">
                {cheque.direction}
              </Badge>
              {cheque.is_post_dated && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  PDC
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500">{party?.name || "Party"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* One-Tap Status Change Dropdown (CH-5) */}
          <ChequeStatusBadge cheque={cheque} onStatusChanged={fetchChequeDetails} />

          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>

          <Button variant="ghost" size="sm" onClick={handleSoftDelete} className="text-red-600 gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Validity Banner (CH-9) */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
          isExpired
            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300"
            : daysRemaining <= 10 && cheque.status !== "cleared"
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300"
            : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isExpired ? (
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          ) : (
            <Clock className="h-5 w-5 text-zinc-500 shrink-0" />
          )}
          <div>
            <span className="font-semibold">
              Cheque Validity: Valid until {formatDate(validityDate)} (3 Months from Cheque Date)
            </span>
            <p className="text-xs opacity-80 mt-0.5">
              {cheque.status === "cleared"
                ? `Cleared successfully on ${formatDate(cheque.cleared_date)}`
                : isExpired
                ? "This cheque has expired (> 3 months). Banks will reject it."
                : `${daysRemaining} days remaining before expiry`}
            </p>
          </div>
        </div>
      </div>

      {/* Cheque Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cheque Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Amount</span>
              <span className="font-bold text-lg text-zinc-950 dark:text-zinc-50">
                {formatINR(cheque.amount)}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Cheque Date</span>
              <span className="font-medium">{formatDate(cheque.cheque_date)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Party</span>
              <span className="font-medium">{party?.name}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Crossing / Payee</span>
              <span className="font-mono text-xs uppercase">{cheque.payee_type.replace("_", " ")}</span>
            </div>

            {/* Bank details */}
            {isReceived ? (
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Payer Bank & Branch</span>
                <span className="font-medium text-right">
                  {cheque.payer_bank || "Not specified"} {cheque.payer_branch ? `(${cheque.payer_branch})` : ""}
                </span>
              </div>
            ) : (
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Drawn on Account</span>
                <span className="font-medium">
                  {bankAccount ? `${bankAccount.nickname} (..${bankAccount.last_four_digits})` : "-"}
                </span>
              </div>
            )}

            {/* Post-dated info */}
            {cheque.is_post_dated && (
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Planned Deposit Date</span>
                <span className="font-semibold text-purple-600">
                  {formatDate(cheque.deposit_date)}
                </span>
              </div>
            )}

            {/* Bounce details (CH-7) */}
            {cheque.status === "bounced" && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 space-y-1">
                <div className="flex justify-between text-xs text-red-700 dark:text-red-300">
                  <span className="font-semibold">Bounce Reason:</span>
                  <span>{cheque.bounce_reason || "Unspecified"}</span>
                </div>
                {cheque.bounce_charges ? (
                  <div className="flex justify-between text-xs text-red-700 dark:text-red-300">
                    <span className="font-semibold">Bounce Charges:</span>
                    <span>{formatINR(cheque.bounce_charges)}</span>
                  </div>
                ) : null}
              </div>
            )}

            {cheque.remarks && (
              <div className="py-1 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Remarks: </span>
                {cheque.remarks}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Bills (LK-1, LK-2) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Linked Bills</span>
              <span className="text-xs font-normal text-zinc-500">
                {linkedBills.length} Bill(s)
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {linkedBills.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-400 border border-dashed rounded-xl">
                No bills currently linked to this cheque.
              </div>
            ) : (
              <div className="space-y-2">
                {linkedBills.map((link) => {
                  const b = link.bills;
                  return (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm"
                    >
                      <div>
                        <Link
                          href={`/bills/${link.bill_id}`}
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                        >
                          <Receipt className="h-4 w-4" />
                          Bill #{b?.bill_number || link.bill_id}
                        </Link>
                        <span className="text-xs text-zinc-400">
                          Total Bill: {formatINR(b?.amount)} • {formatDate(b?.bill_date)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-zinc-400">Paid by this cheque</span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(link.amount_applied)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status History Timeline (CH-6: Every status change stored with time, old status and new status) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            Status History & Audit Trail
          </CardTitle>
        </CardHeader>

        <CardContent>
          {history.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-400">No status changes recorded</div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
              {history.map((item, idx) => (
                <div key={item.id} className="relative">
                  <div
                    className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                      idx === 0 ? "bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950" : "bg-zinc-400"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm capitalize text-zinc-900 dark:text-zinc-100">
                        {item.new_status}
                      </span>
                      {item.old_status && (
                        <span className="text-xs text-zinc-400">
                          (changed from {item.old_status})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(item.changed_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {item.notes ? ` • ${item.notes}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog (CH-8) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Cheque</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cheque Number *</label>
              <Input
                required
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount (₹) *</label>
              <Input
                type="number"
                step="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cheque Date *</label>
              <Input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Remarks</label>
              <Input
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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

export default function ChequeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading cheque...</div>}>
      <ChequeDetailContent params={params} />
    </React.Suspense>
  );
}

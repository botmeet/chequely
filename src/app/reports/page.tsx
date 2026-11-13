"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Download,
  Database,
  ArrowRight,
  Receipt,
  CreditCard,
  Users,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  downloadExcelFile,
  downloadFullBackupExcel,
  ChequeExportRow,
  BillExportRow,
} from "@/lib/export-excel";

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);

  // Aging Summary (LD-2)
  const [recAging, setRecAging] = useState({ "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 });
  const [payAging, setPayAging] = useState({ "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 });

  useEffect(() => {
    const fetchAging = async () => {
      try {
        const supabase = createClient();
        const { data: bills } = await supabase.from("bill_status").select("*").eq("is_deleted", false);

        const r = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
        const p = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

        bills?.forEach((b) => {
          const unpaid = Number(b.unpaid_amount);
          if (unpaid > 0) {
            const daysOld = Math.floor(
              (new Date().getTime() - new Date(b.bill_date).getTime()) / (1000 * 3600 * 24)
            );
            const target = b.direction === "sale" ? r : p;

            if (daysOld <= 30) target["0-30"] += unpaid;
            else if (daysOld <= 60) target["31-60"] += unpaid;
            else if (daysOld <= 90) target["61-90"] += unpaid;
            else target["90+"] += unpaid;
          }
        });

        setRecAging(r);
        setPayAging(p);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAging();
  }, []);

  // EX-1: Export Cheque Register
  const exportCheques = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("cheques")
        .select("*, parties(name), bank_accounts(nickname), cheque_bill_links(bills(bill_number))")
        .eq("is_deleted", false)
        .order("cheque_date", { ascending: false });

      if (!data) return;

      const rows: ChequeExportRow[] = data.map((c) => ({
        "Cheque Date": formatDate(c.cheque_date),
        "Cheque Number": c.cheque_number,
        Direction: c.direction.toUpperCase(),
        Party: c.parties?.name || "",
        "Bank Account / Payer Bank":
          c.direction === "issued" ? c.bank_accounts?.nickname || "" : c.payer_bank || "",
        "Amount (INR)": Number(c.amount),
        Status: c.status.toUpperCase(),
        "Is PDC": c.is_post_dated ? "YES" : "NO",
        "Deposit Date": c.deposit_date ? formatDate(c.deposit_date) : "",
        "Linked Bills":
          c.cheque_bill_links?.map((l: { bills?: { bill_number: string } }) => l.bills?.bill_number).filter(Boolean).join(", ") || "",
        Remarks: c.remarks || "",
      }));

      downloadExcelFile(
        rows as unknown as Record<string, unknown>[],
        "Cheques Register",
        `Cheques_Register_${new Date().toISOString().split("T")[0]}`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // EX-1: Export Bill Register
  const exportBills = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("bill_status")
        .select("*, parties(name)")
        .eq("is_deleted", false)
        .order("bill_date", { ascending: false });

      if (!data) return;

      const rows: BillExportRow[] = data.map((b) => ({
        "Bill Date": formatDate(b.bill_date),
        "Bill Number": b.bill_number,
        Direction: b.direction.toUpperCase(),
        Party: b.parties?.name || "",
        "Due Date": b.due_date ? formatDate(b.due_date) : "",
        "Total Amount (INR)": Number(b.bill_amount),
        "Paid Amount (INR)": Number(b.paid_amount),
        "Unpaid Amount (INR)": Number(b.unpaid_amount),
        Status: b.payment_status.toUpperCase(),
        Notes: b.notes || "",
      }));

      downloadExcelFile(
        rows as unknown as Record<string, unknown>[],
        "Bill Register",
        `Bills_Register_${new Date().toISOString().split("T")[0]}`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // EX-2: Full Backup Export (multi-sheet)
  const exportFullBackup = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const [cRes, bRes, pRes, aRes] = await Promise.all([
        supabase.from("cheques").select("*"),
        supabase.from("bills").select("*"),
        supabase.from("parties").select("*"),
        supabase.from("bank_accounts").select("*"),
      ]);

      downloadFullBackupExcel({
        cheques: cRes.data || [],
        bills: bRes.data || [],
        parties: pRes.data || [],
        accounts: aRes.data || [],
      });
    } catch (err) {
      console.error(err);
      alert("Failed to create full backup export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Data Export</h1>
        <p className="text-sm text-zinc-500">
          Aging reports, party ledger statements, and Excel backup exports
        </p>
      </div>

      {/* Full Backup Banner (EX-2: PRD Section 12 Data Safety) */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border-indigo-200 dark:border-indigo-900">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Full Database Backup (.xlsx)
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Exports all your cheques, bills, parties, and accounts into a single multi-sheet Excel file.
              </p>
            </div>
          </div>

          <Button onClick={exportFullBackup} disabled={loading} className="gap-2 shrink-0">
            <Download className="h-4 w-4" />
            Download Full Backup
          </Button>
        </CardContent>
      </Card>

      {/* Quick Access to Party Ledger (LD-1) */}
      <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Party Ledger & Running Balance</h3>
              <p className="text-xs text-zinc-500">
                View chronological statement of all bills and cheques for any customer or supplier
              </p>
            </div>
          </div>

          <Link href="/reports/ledger">
            <Button variant="outline" size="sm" className="gap-1.5">
              Open Ledger <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Aging Reports (LD-2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Receivable Aging */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400">
              Receivable Aging (Customer Dues)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "0 – 30 Days", val: recAging["0-30"] },
              { label: "31 – 60 Days", val: recAging["31-60"] },
              { label: "61 – 90 Days", val: recAging["61-90"] },
              { label: "Over 90 Days", val: recAging["90+"], alert: true },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-sm"
              >
                <span className={`font-medium ${item.alert && item.val > 0 ? "text-red-500 font-bold" : "text-zinc-600 dark:text-zinc-400"}`}>
                  {item.label}
                </span>
                <span className="font-bold">{formatINR(item.val)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payable Aging */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-700 dark:text-amber-400">
              Payable Aging (Supplier Dues)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "0 – 30 Days", val: payAging["0-30"] },
              { label: "31 – 60 Days", val: payAging["31-60"] },
              { label: "61 – 90 Days", val: payAging["61-90"] },
              { label: "Over 90 Days", val: payAging["90+"] },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-sm"
              >
                <span className="font-medium text-zinc-600 dark:text-zinc-400">{item.label}</span>
                <span className="font-bold">{formatINR(item.val)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Individual Table Export Buttons (EX-1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-indigo-600" />
              <div>
                <p className="font-semibold text-sm">Cheque Register (.xlsx)</p>
                <p className="text-xs text-zinc-500">All cheques with statuses & bank details</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportCheques} disabled={loading} className="gap-1.5">
              <Download className="h-4 w-4" /> Export
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-semibold text-sm">Bill Register (.xlsx)</p>
                <p className="text-xs text-zinc-500">Sales & purchases with paid/unpaid balances</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportBills} disabled={loading} className="gap-1.5">
              <Download className="h-4 w-4" /> Export
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


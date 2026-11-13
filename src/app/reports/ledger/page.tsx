"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet, Users, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Party, Bill, Cheque } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { downloadExcelFile, LedgerExportRow } from "@/lib/export-excel";
import { PartySelect } from "@/components/forms/party-select";

interface LedgerEntry {
  id: string;
  date: string;
  type: "bill" | "cheque";
  reference: string;
  debit: number; // Sale bill or Issued cheque payment
  credit: number; // Purchase bill or Received cheque receipt
  runningBalance: number;
  status?: string;
  notes?: string;
}

function PartyLedgerContent() {
  const searchParams = useSearchParams();
  const initialParty = searchParams.get("party_id");

  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(
    initialParty ? parseInt(initialParty) : null
  );
  const [party, setParty] = useState<Party | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPartyId) {
      setEntries([]);
      setParty(null);
      return;
    }

    const fetchLedger = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // 1. Fetch party info
        const { data: pData } = await supabase
          .from("parties")
          .select("*")
          .eq("id", selectedPartyId)
          .single();

        if (pData) setParty(pData as Party);

        // 2. Fetch all bills for party
        const { data: billsData } = await supabase
          .from("bills")
          .select("*")
          .eq("party_id", selectedPartyId)
          .eq("is_deleted", false);

        // 3. Fetch all cheques for party
        const { data: chequesData } = await supabase
          .from("cheques")
          .select("*")
          .eq("party_id", selectedPartyId)
          .eq("is_deleted", false);

        // 4. Combine and sort chronologically
        const rawList: Array<{
          id: string;
          date: string;
          type: "bill" | "cheque";
          reference: string;
          debit: number;
          credit: number;
          status?: string;
          notes?: string;
        }> = [];

        billsData?.forEach((b: Bill) => {
          if (b.direction === "sale") {
            // Sale = Receivable = Debit
            rawList.push({
              id: `b-${b.id}`,
              date: b.bill_date,
              type: "bill",
              reference: `Sale Bill #${b.bill_number}`,
              debit: Number(b.amount),
              credit: 0,
              notes: b.notes || "",
            });
          } else {
            // Purchase = Payable = Credit
            rawList.push({
              id: `b-${b.id}`,
              date: b.bill_date,
              type: "bill",
              reference: `Purchase Bill #${b.bill_number}`,
              debit: 0,
              credit: Number(b.amount),
              notes: b.notes || "",
            });
          }
        });

        chequesData?.forEach((c: Cheque) => {
          if (c.status === "bounced" || c.status === "cancelled") return; // exclude bounced cheques from balance per PRD

          if (c.direction === "received") {
            // Received cheque = Credit (reduces customer balance)
            rawList.push({
              id: `c-${c.id}`,
              date: c.cheque_date,
              type: "cheque",
              reference: `Cheque Received #${c.cheque_number}`,
              debit: 0,
              credit: Number(c.amount),
              status: c.status,
              notes: c.remarks || "",
            });
          } else {
            // Issued cheque = Debit (reduces vendor liability)
            rawList.push({
              id: `c-${c.id}`,
              date: c.cheque_date,
              type: "cheque",
              reference: `Cheque Issued #${c.cheque_number}`,
              debit: Number(c.amount),
              credit: 0,
              status: c.status,
              notes: c.remarks || "",
            });
          }
        });

        // Sort by date ascending
        rawList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate running balance (Debit - Credit)
        let running = 0;
        const ledger: LedgerEntry[] = rawList.map((item) => {
          running += item.debit - item.credit;
          return {
            ...item,
            runningBalance: running,
          };
        });

        setEntries(ledger);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [selectedPartyId]);

  const handleExport = () => {
    if (!party || entries.length === 0) return;

    const exportRows: LedgerExportRow[] = entries.map((e) => ({
      Date: formatDate(e.date),
      Type: e.type.toUpperCase(),
      Reference: e.reference,
      "Debit (Sale / Receivable)": e.debit > 0 ? e.debit : "",
      "Credit (Receipt / Cheque)": e.credit > 0 ? e.credit : "",
      "Running Balance": e.runningBalance,
    }));

    downloadExcelFile(
      exportRows as unknown as Record<string, unknown>[],
      "Party Ledger",
      `Ledger_${party.name.replace(/\s+/g, "_")}`
    );
  };

  const finalBalance = entries.length > 0 ? entries[entries.length - 1].runningBalance : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Party Ledger</h1>
            <p className="text-sm text-zinc-500">
              Complete statement of bills, cheques, and running balance (LD-1)
            </p>
          </div>
        </div>

        {entries.length > 0 && (
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export to Excel (.xlsx)
          </Button>
        )}
      </div>

      {/* Select Party */}
      <Card className="p-4">
        <div className="max-w-md space-y-1.5">
          <label className="text-sm font-semibold">Select Party to View Statement</label>
          <PartySelect
            value={selectedPartyId}
            onChange={setSelectedPartyId}
            placeholder="Search party by name..."
          />
        </div>
      </Card>

      {/* Ledger Table */}
      {loading ? (
        <div className="p-8 text-center text-sm text-zinc-500">Loading ledger entries...</div>
      ) : !selectedPartyId ? (
        <Card className="text-center p-8 text-zinc-500">
          Please select a party above to view their statement of accounts.
        </Card>
      ) : entries.length === 0 ? (
        <Card className="text-center p-8 text-zinc-500">
          No transactions found for {party?.name}.
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div>
              <h2 className="text-lg font-bold">{party?.name}</h2>
              <p className="text-xs text-zinc-400 capitalize">Type: {party?.party_type}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-500">Net Outstanding Balance: </span>
              <span
                className={`text-xl font-bold ${
                  finalBalance > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : finalBalance < 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-600"
                }`}
              >
                {formatINR(Math.abs(finalBalance))} {finalBalance > 0 ? "(Receivable Dr)" : finalBalance < 0 ? "(Payable Cr)" : ""}
              </span>
            </div>
          </div>

          {/* Desktop Table / Mobile Cards */}
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs font-semibold text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Reference / Transaction</th>
                  <th className="p-3.5 text-right">Debit (Sale / Dr)</th>
                  <th className="p-3.5 text-right">Credit (Receipt / Cr)</th>
                  <th className="p-3.5 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {entries.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <td className="p-3.5 whitespace-nowrap text-xs font-mono">{formatDate(row.date)}</td>
                    <td className="p-3.5">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.reference}</div>
                      {row.notes && <p className="text-xs text-zinc-400 italic">{row.notes}</p>}
                    </td>
                    <td className="p-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {row.debit > 0 ? formatINR(row.debit) : "-"}
                    </td>
                    <td className="p-3.5 text-right font-medium text-amber-600 dark:text-amber-400">
                      {row.credit > 0 ? formatINR(row.credit) : "-"}
                    </td>
                    <td className="p-3.5 text-right font-bold font-mono">
                      {formatINR(row.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function PartyLedgerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading ledger...</div>}>
      <PartyLedgerContent />
    </Suspense>
  );
}


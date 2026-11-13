"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  CreditCard,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Calendar,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { Cheque, ChequeDirection, ChequeStatus, BankAccount, Party } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChequeStatusBadge } from "@/components/cheques/status-badge";
import { useGlobalAccount } from "@/components/navigation/global-account-context";

interface ExtendedCheque extends Omit<Cheque, "cheque_bill_links"> {
  parties?: Party;
  bank_accounts?: BankAccount;
  cheque_bill_links?: Array<{
    amount_applied: number;
    bills?: { id: number; bill_number: string };
  }>;
}

export default function ChequesPage() {
  const { selectedAccountId } = useGlobalAccount();
  const [cheques, setCheques] = useState<ExtendedCheque[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters (LS-2, LS-3)
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchCheques = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("cheques")
        .select(`
          *,
          parties(id, name, phone),
          bank_accounts(id, nickname, last_four_digits),
          cheque_bill_links(amount_applied, bills(id, bill_number))
        `)
        .eq("is_deleted", false)
        .order("cheque_date", { ascending: false });

      if (selectedAccountId !== "all") {
        query = query.eq("bank_account_id", parseInt(selectedAccountId));
      }

      const { data, error } = await query;
      if (!error && data) {
        setCheques(data as ExtendedCheque[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheques();
  }, [selectedAccountId]);

  const filteredCheques = cheques.filter((c) => {
    const partyName = c.parties?.name || "";
    const bankNickname = c.bank_accounts?.nickname || "";
    const payerBank = c.payer_bank || "";
    const linkedBillNumbers =
      c.cheque_bill_links?.map((l) => l.bills?.bill_number || "").join(" ") || "";

    const query = search.toLowerCase();
    const matchesSearch =
      c.cheque_number.toLowerCase().includes(query) ||
      partyName.toLowerCase().includes(query) ||
      bankNickname.toLowerCase().includes(query) ||
      payerBank.toLowerCase().includes(query) ||
      linkedBillNumbers.toLowerCase().includes(query) ||
      c.amount.toString().includes(query);

    const matchesDirection = directionFilter === "all" || c.direction === directionFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    let matchesDate = true;
    if (startDate && c.cheque_date < startDate) matchesDate = false;
    if (endDate && c.cheque_date > endDate) matchesDate = false;

    return matchesSearch && matchesDirection && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cheques Register</h1>
          <p className="text-sm text-zinc-500">
            Track cheques received and issued through their full lifecycles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/cheques/new?direction=received">
            <Button variant="outline" size="sm" className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
              <ArrowDownLeft className="h-4 w-4" /> Received
            </Button>
          </Link>
          <Link href="/cheques/new?direction=issued">
            <Button size="sm" className="gap-1.5">
              <ArrowUpRight className="h-4 w-4" /> Issued
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters Bar (LS-2, LS-3) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search cheque #, party, bill #, amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-in fade-in">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Direction</label>
              <Select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="all">All Directions</option>
                <option value="received">Received (from Customer)</option>
                <option value="issued">Issued (to Supplier)</option>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="received">Received</option>
                <option value="deposited">Deposited</option>
                <option value="issued">Issued</option>
                <option value="presented">Presented</option>
                <option value="cleared">Cleared</option>
                <option value="bounced">Bounced</option>
                <option value="stopped">Stopped</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cheque List View (LS-1: date, cheque number, party, bank account, amount, status, linked bills) */}
      {loading ? (
        <div className="p-8 text-center text-sm text-zinc-500">Loading cheques register...</div>
      ) : filteredCheques.length === 0 ? (
        <Card className="text-center p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <CreditCard className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">No cheques recorded</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            Record cheques received from customers or issued from your bank accounts.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/cheques/new?direction=received">
              <Button variant="outline">Record Received</Button>
            </Link>
            <Link href="/cheques/new?direction=issued">
              <Button>Record Issued</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCheques.map((ch) => {
            const isReceived = ch.direction === "received";
            const partyName = ch.parties?.name || "Party";
            const bankLabel = isReceived
              ? ch.payer_bank || "Customer Bank"
              : ch.bank_accounts
              ? `${ch.bank_accounts.nickname} (..${ch.bank_accounts.last_four_digits})`
              : "Bank";

            const linkedBills = ch.cheque_bill_links || [];

            return (
              <Card
                key={ch.id}
                className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Direction Icon, Cheque Number, Party */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isReceived
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                          }`}
                        >
                          {isReceived ? (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                        </span>

                        <Link
                          href={`/cheques/${ch.id}`}
                          className="font-bold text-base text-zinc-950 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                        >
                          Cheque #{ch.cheque_number}
                        </Link>

                        <span className="text-xs text-zinc-400 uppercase">
                          ({ch.direction})
                        </span>

                        {ch.is_post_dated && (
                          <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                            PDC
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {partyName}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(ch.cheque_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Landmark className="h-3 w-3" /> {bankLabel}
                        </span>

                        {linkedBills.length > 0 && (
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                            <Receipt className="h-3 w-3" />
                            {linkedBills.length} Bill(s):{" "}
                            {linkedBills.map((l) => l.bills?.bill_number).filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & One-Tap Status Badge (CH-5) */}
                    <div className="flex items-center justify-between sm:justify-end sm:text-right gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                      <div>
                        <div className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                          {formatINR(ch.amount)}
                        </div>
                        {ch.is_post_dated && ch.deposit_date && (
                          <span className="text-[11px] text-zinc-400 block">
                            Deposit: {formatDate(ch.deposit_date)}
                          </span>
                        )}
                      </div>

                      {/* One-Tap Status Change Button (CH-5) */}
                      <ChequeStatusBadge cheque={ch} onStatusChanged={fetchCheques} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

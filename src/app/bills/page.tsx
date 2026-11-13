"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Receipt, Search, Filter, AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { BillStatusView } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BillsPage() {
  const [bills, setBills] = useState<BillStatusView[]>([]);
  const [partyNames, setPartyNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchBills = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      // Fetch bill_status view
      const { data, error } = await supabase
        .from("bill_status")
        .select("*")
        .eq("is_deleted", false)
        .order("bill_date", { ascending: false });

      if (!error && data) {
        setBills(data as BillStatusView[]);

        // Fetch party names
        const partyIds = Array.from(new Set(data.map((b: BillStatusView) => b.party_id)));
        if (partyIds.length > 0) {
          const { data: pData } = await supabase
            .from("parties")
            .select("id, name")
            .in("id", partyIds);

          if (pData) {
            const map: Record<number, string> = {};
            pData.forEach((p) => {
              map[p.id] = p.name;
            });
            setPartyNames(map);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const filteredBills = bills.filter((b) => {
    const partyName = partyNames[b.party_id] || "";
    const matchesSearch =
      b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      partyName.toLowerCase().includes(search.toLowerCase()) ||
      b.bill_amount.toString().includes(search);

    const matchesDirection = directionFilter === "all" || b.direction === directionFilter;

    let matchesStatus = true;
    if (statusFilter === "unpaid") matchesStatus = b.payment_status === "unpaid";
    else if (statusFilter === "partly_paid") matchesStatus = b.payment_status === "partly_paid";
    else if (statusFilter === "paid") matchesStatus = b.payment_status === "paid";
    else if (statusFilter === "overdue") matchesStatus = b.is_overdue;

    return matchesSearch && matchesDirection && matchesStatus;
  });

  const getStatusBadge = (b: BillStatusView) => {
    if (b.is_overdue) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" /> Overdue
        </Badge>
      );
    }
    if (b.payment_status === "paid") {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> Paid
        </Badge>
      );
    }
    if (b.payment_status === "partly_paid") {
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" /> Partly Paid
        </Badge>
      );
    }
    return <Badge variant="outline">Unpaid</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bills & Invoices</h1>
          <p className="text-sm text-zinc-500">
            Track sale invoices (receivables) and purchase bills (payables)
          </p>
        </div>

        <Link href="/bills/new">
          <Button className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add Bill
          </Button>
        </Link>
      </div>

      {/* Search and Filters (LS-2, LS-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by bill number, party, amount..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <Select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
          >
            <option value="all">All Directions</option>
            <option value="sale">Sales (Receivable)</option>
            <option value="purchase">Purchases (Payable)</option>
          </Select>
        </div>

        <div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partly_paid">Partly Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue Only</option>
          </Select>
        </div>
      </div>

      {/* Bill List */}
      {loading ? (
        <div className="p-8 text-center text-sm text-zinc-500">Loading bills...</div>
      ) : filteredBills.length === 0 ? (
        <Card className="text-center p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Receipt className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">No bills found</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            Record a sale invoice to track payments from customers, or a purchase bill to track payments to vendors.
          </p>
          <Link href="/bills/new">
            <Button>Create Your First Bill</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBills.map((b) => {
            const isSale = b.direction === "sale";
            const party = partyNames[b.party_id] || "Party";
            const percentPaid = Math.min(100, Math.round((b.paid_amount / b.bill_amount) * 100));

            return (
              <Link key={b.bill_id} href={`/bills/${b.bill_id}`} className="block">
                <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              isSale
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {isSale ? (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <span className="font-bold text-base">Bill #{b.bill_number}</span>
                          <span className="text-xs text-zinc-400 uppercase">({b.direction})</span>
                          {getStatusBadge(b)}
                        </div>

                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {party}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                          <span>Date: {formatDate(b.bill_date)}</span>
                          {b.due_date && <span>Due: {formatDate(b.due_date)}</span>}
                          {b.notes && <span className="italic truncate max-w-xs">&quot;{b.notes}&quot;</span>}
                        </div>
                      </div>

                      {/* Amount and Payment Status */}
                      <div className="sm:text-right space-y-1">
                        <div className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                          {formatINR(b.bill_amount)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Paid: <span className="font-medium text-emerald-600">{formatINR(b.paid_amount)}</span>
                          {" • "}
                          Unpaid: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatINR(b.unpaid_amount)}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full sm:w-36 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full ${
                              percentPaid >= 100
                                ? "bg-emerald-500"
                                : percentPaid > 0
                                ? "bg-amber-500"
                                : "bg-zinc-300 dark:bg-zinc-700"
                            }`}
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


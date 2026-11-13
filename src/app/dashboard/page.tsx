"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CreditCard,
  Receipt,
  Landmark,
  Plus,
  Calendar,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  Cheque,
  BankAccount,
  ChequeAlertView,
  PartyOutstandingView,
  BillStatusView,
} from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { useGlobalAccount } from "@/components/navigation/global-account-context";

export default function DashboardPage() {
  const { selectedAccountId, accounts } = useGlobalAccount();

  const [loading, setLoading] = useState(true);
  const [totalBookBalance, setTotalBookBalance] = useState(0);
  const [totalReceivable, setTotalReceivable] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [pendingChequesCount, setPendingChequesCount] = useState(0);
  const [pendingChequesAmount, setPendingChequesAmount] = useState(0);

  // Section 9: Needs Attention Alerts
  const [alerts, setAlerts] = useState<ChequeAlertView[]>([]);

  // Recent 10 entries (DB-5)
  const [recentCheques, setRecentCheques] = useState<Cheque[]>([]);

  // Charts data
  const [cashFlowData, setCashFlowData] = useState<Array<{ month: string; inflow: number; outflow: number }>>([]);
  const [statusData, setStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [topPartiesData, setTopPartiesData] = useState<Array<{ name: string; amount: number }>>([]);
  const [agingData, setAgingData] = useState<Array<{ range: string; amount: number }>>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch bank accounts for book balance calculation (PRD Section 8 Rule 4)
      let accQuery = supabase.from("bank_accounts").select("*").eq("is_archived", false);
      if (selectedAccountId !== "all") {
        accQuery = accQuery.eq("id", parseInt(selectedAccountId));
      }
      const { data: accData } = await accQuery;

      // 2. Fetch cheques for balance and pending metrics
      let chequesQuery = supabase.from("cheques").select("*").eq("is_deleted", false);
      if (selectedAccountId !== "all") {
        chequesQuery = chequesQuery.eq("bank_account_id", parseInt(selectedAccountId));
      }
      const { data: chequesData } = await chequesQuery;

      // Calculate Book Balance: opening balance + cleared received - cleared issued
      let initialOpening = 0;
      accData?.forEach((a: BankAccount) => {
        initialOpening += Number(a.opening_balance);
      });

      let clearedInflow = 0;
      let clearedOutflow = 0;
      let pendingCount = 0;
      let pendingAmt = 0;

      const statusCounts: Record<string, number> = {};

      chequesData?.forEach((c: Cheque) => {
        // Status counts for pie chart
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;

        if (c.status === "cleared") {
          if (c.direction === "received") clearedInflow += Number(c.amount);
          if (c.direction === "issued") clearedOutflow += Number(c.amount);
        } else if (c.status !== "bounced" && c.status !== "stopped" && c.status !== "cancelled") {
          pendingCount += 1;
          pendingAmt += Number(c.amount);
        }
      });

      setTotalBookBalance(initialOpening + clearedInflow - clearedOutflow);
      setPendingChequesCount(pendingCount);
      setPendingChequesAmount(pendingAmt);

      // Status chart format
      const colorMap: Record<string, string> = {
        cleared: "#10b981",
        received: "#6366f1",
        issued: "#3b82f6",
        deposited: "#06b6d4",
        presented: "#f59e0b",
        bounced: "#ef4444",
        stopped: "#71717a",
        cancelled: "#a1a1aa",
      };
      setStatusData(
        Object.keys(statusCounts).map((st) => ({
          name: st.charAt(0).toUpperCase() + st.slice(1),
          value: statusCounts[st],
          color: colorMap[st] || "#8b5cf6",
        }))
      );

      // 3. Fetch receivables and payables from bill_status
      const { data: billsData } = await supabase.from("bill_status").select("*").eq("is_deleted", false);

      let rec = 0;
      let pay = 0;
      const aging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

      billsData?.forEach((b: BillStatusView) => {
        const unpaid = Number(b.unpaid_amount);
        if (unpaid > 0) {
          if (b.direction === "sale") {
            rec += unpaid;
            // Calculate aging days
            const daysOld = Math.floor(
              (new Date().getTime() - new Date(b.bill_date).getTime()) / (1000 * 3600 * 24)
            );
            if (daysOld <= 30) aging["0-30"] += unpaid;
            else if (daysOld <= 60) aging["31-60"] += unpaid;
            else if (daysOld <= 90) aging["61-90"] += unpaid;
            else aging["90+"] += unpaid;
          } else {
            pay += unpaid;
          }
        }
      });

      setTotalReceivable(rec);
      setTotalPayable(pay);
      setAgingData([
        { range: "0-30 days", amount: aging["0-30"] },
        { range: "31-60 days", amount: aging["31-60"] },
        { range: "61-90 days", amount: aging["61-90"] },
        { range: "90+ days", amount: aging["90+"] },
      ]);

      // 4. Fetch Top Outstanding Parties
      const { data: partyOut } = await supabase
        .from("party_outstanding")
        .select("*")
        .eq("is_deleted", false)
        .order("total_receivable", { ascending: false })
        .limit(5);

      if (partyOut) {
        setTopPartiesData(
          partyOut.map((p: PartyOutstandingView) => ({
            name: p.party_name,
            amount: Number(p.total_receivable),
          }))
        );
      }

      // 5. Fetch Needs Attention Alerts from cheque_alerts view (Section 9)
      const { data: alertsData } = await supabase.from("cheque_alerts").select("*").limit(8);
      if (alertsData) {
        setAlerts(alertsData as ChequeAlertView[]);
      }

      // 6. Fetch Recent Activity (DB-5: last 10 entries)
      const { data: recent } = await supabase
        .from("cheques")
        .select("*, parties(name)")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (recent) setRecentCheques(recent as Cheque[]);

      // Cash flow mockup from cleared entries
      setCashFlowData([
        { month: "Sep", inflow: clearedInflow * 0.3, outflow: clearedOutflow * 0.25 },
        { month: "Oct", inflow: clearedInflow * 0.35, outflow: clearedOutflow * 0.4 },
        { month: "Nov", inflow: clearedInflow * 0.35, outflow: clearedOutflow * 0.35 },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedAccountId]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions (DB-6) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-sm text-zinc-500">
            {selectedAccountId === "all"
              ? "Combined overview for all bank accounts"
              : `Showing metrics for ${accounts.find((a) => a.id.toString() === selectedAccountId)?.nickname || "Account"}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/cheques/new?direction=received">
            <Button size="sm" variant="outline" className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
              <ArrowDownLeft className="h-4 w-4" /> Cheque In
            </Button>
          </Link>
          <Link href="/cheques/new?direction=issued">
            <Button size="sm" variant="outline" className="gap-1.5">
              <ArrowUpRight className="h-4 w-4" /> Cheque Out
            </Button>
          </Link>
          <Link href="/bills/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Bill
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards (DB-1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Book Balance */}
        <Card className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-900 border-indigo-100 dark:border-indigo-900/50">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Total Book Balance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50 mt-2">
              {formatINR(totalBookBalance)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Cleared received − issued</p>
          </CardContent>
        </Card>

        {/* Total Receivable */}
        <Card className="bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-zinc-900 border-emerald-100 dark:border-emerald-900/50">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Total Receivable
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">
              {formatINR(totalReceivable)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Money customers owe you</p>
          </CardContent>
        </Card>

        {/* Total Payable */}
        <Card className="bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-zinc-900 border-amber-100 dark:border-amber-900/50">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Total Payable
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 mt-2">
              {formatINR(totalPayable)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Money you owe suppliers</p>
          </CardContent>
        </Card>

        {/* Pending Clearance */}
        <Card className="bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-zinc-900 border-blue-100 dark:border-blue-900/50">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Pending Clearance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">
              {formatINR(pendingChequesAmount)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">{pendingChequesCount} cheque(s) in transit</p>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention Section (DB-2, Section 9) */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Needs Attention Today</CardTitle>
              <p className="text-xs text-zinc-500">
                PDCs due, uncleared issued cheques, bounced items & overdue bills
              </p>
            </div>
          </div>
          <Badge variant="destructive" className="font-semibold text-xs">
            {alerts.length} Action{alerts.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>

        <CardContent>
          {alerts.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">
              🎉 All clear! No bounced cheques, pending PDCs, or overdue bills requiring immediate attention.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={alert.severity === "High" ? "destructive" : "warning"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {alert.title}
                      </Badge>
                      <span className="text-xs text-zinc-400">{formatDate(alert.alert_date)}</span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2">
                      {alert.description}
                    </p>
                  </div>

                  <Link
                    href={alert.alert_type === "overdue_bill" ? `/bills/${alert.entity_id}` : `/cheques/${alert.entity_id}`}
                    className="p-1.5 text-indigo-600 hover:text-indigo-800 shrink-0"
                    title="View item"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Account Cards Carousel (DB-3) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Your Bank Accounts</h2>
          <Link href="/accounts" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{acc.nickname}</h3>
                  <p className="text-xs text-zinc-500 font-mono">•••• {acc.last_four_digits}</p>
                </div>
                <Badge variant="outline" className="uppercase text-[10px]">
                  {acc.account_type.replace("_", "/")}
                </Badge>
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-baseline text-xs">
                <span className="text-zinc-500">Opening Balance:</span>
                <span className="font-semibold">{formatINR(acc.opening_balance)}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recharts Analytics Charts (DB-4) */}
      <DashboardCharts
        cashFlowData={cashFlowData}
        statusData={statusData}
        topPartiesData={topPartiesData}
        agingData={agingData}
      />

      {/* Recent Activity (DB-5: last 10 entries) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Cheque Activity</CardTitle>
          <Link href="/cheques" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            View All
          </Link>
        </CardHeader>
        <CardContent>
          {recentCheques.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400">No cheques entered yet</div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentCheques.map((c) => (
                <Link
                  key={c.id}
                  href={`/cheques/${c.id}`}
                  className="flex items-center justify-between py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        c.direction === "received"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                      }`}
                    >
                      {c.direction === "received" ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Cheque #{c.cheque_number}</p>
                      <p className="text-xs text-zinc-500">{formatDate(c.cheque_date)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold">{formatINR(c.amount)}</p>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {c.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


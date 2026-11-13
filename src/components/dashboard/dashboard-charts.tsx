"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

interface CashFlowItem {
  month: string;
  inflow: number;
  outflow: number;
}

interface StatusItem {
  name: string;
  value: number;
  color: string;
}

interface OutstandingPartyItem {
  name: string;
  amount: number;
}

interface DashboardChartsProps {
  cashFlowData: CashFlowItem[];
  statusData: StatusItem[];
  topPartiesData: OutstandingPartyItem[];
  agingData: Array<{ range: string; amount: number }>;
}

const COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function DashboardCharts({
  cashFlowData,
  statusData,
  topPartiesData,
  agingData,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Cash Flow In vs Out */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cleared Cash Flow (In vs Out)</CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          {cashFlowData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              No cleared transactions recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData}>
                <XAxis dataKey="month" fontSize={11} stroke="#888888" />
                <YAxis
                  fontSize={11}
                  stroke="#888888"
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [formatINR(Number(val)), ""]}
                  contentStyle={{
                    borderRadius: "8px",
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="inflow" name="Received (In)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" name="Issued (Out)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 2. Receivable Aging Report */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Receivable Aging (Unpaid Sales)</CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          {agingData.every((d) => d.amount === 0) ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              No outstanding receivables
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} layout="vertical">
                <XAxis
                  type="number"
                  fontSize={11}
                  stroke="#888888"
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <YAxis dataKey="range" type="category" fontSize={11} stroke="#888888" width={65} />
                <Tooltip
                  formatter={(val) => [formatINR(Number(val)), "Outstanding"]}
                  contentStyle={{
                    borderRadius: "8px",
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 3. Cheque Status Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cheque Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          {statusData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              No cheques recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name || ""} (${((percent || 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`${val} cheques`, "Count"]}
                  contentStyle={{
                    borderRadius: "8px",
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 4. Top 5 Outstanding Parties */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Outstanding Parties</CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-2 overflow-y-auto">
          {topPartiesData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              No outstanding balances
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {topPartiesData.map((party, idx) => (
                <div key={party.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-medium truncate max-w-[180px] sm:max-w-xs">{party.name}</span>
                  </div>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {formatINR(party.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


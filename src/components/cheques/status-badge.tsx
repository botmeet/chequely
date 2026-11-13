"use client";

import React, { useState } from "react";
import { ChevronDown, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Cheque, ChequeStatus, ChequeDirection } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toInputDate } from "@/lib/utils";

export interface StatusChequeProps {
  id: number;
  status: ChequeStatus;
  direction: ChequeDirection;
  bounce_reason?: string | null;
  bounce_charges?: number | null;
  cleared_date?: string | null;
}

interface StatusBadgeWithChangeProps {
  cheque: StatusChequeProps;
  onStatusChanged?: () => void;
}

export function ChequeStatusBadge({ cheque, onStatusChanged }: StatusBadgeWithChangeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bounceDialogOpen, setBounceDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const [bounceReason, setBounceReason] = useState("");
  const [bounceCharges, setBounceCharges] = useState("0");
  const [clearedDate, setClearedDate] = useState(toInputDate(new Date()));
  const [updating, setUpdating] = useState(false);

  // Section 7 Allowed Statuses:
  // Received: Received, Deposited, Cleared, Bounced
  // Issued: Issued, Presented, Cleared, Bounced, Stopped, Cancelled
  const allowedStatuses: ChequeStatus[] =
    cheque.direction === "received"
      ? ["received", "deposited", "cleared", "bounced"]
      : ["issued", "presented", "cleared", "bounced", "stopped", "cancelled"];

  const handleSelectStatus = async (newStatus: ChequeStatus) => {
    setIsOpen(false);
    if (newStatus === cheque.status) return;

    if (newStatus === "bounced") {
      setBounceReason("");
      setBounceCharges("0");
      setBounceDialogOpen(true);
      return;
    }

    if (newStatus === "cleared") {
      setClearedDate(toInputDate(new Date()));
      setClearDialogOpen(true);
      return;
    }

    // Direct update for other statuses
    await executeStatusUpdate(newStatus, {});
  };

  const executeStatusUpdate = async (
    newStatus: ChequeStatus,
    extra: { bounce_reason?: string; bounce_charges?: number; cleared_date?: string }
  ) => {
    setUpdating(true);
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        status: newStatus,
        ...extra,
      };

      const { error } = await supabase
        .from("cheques")
        .update(payload)
        .eq("id", cheque.id);

      if (error) throw error;
      onStatusChanged?.();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
      setBounceDialogOpen(false);
      setClearDialogOpen(false);
    }
  };

  const handleBounceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeStatusUpdate("bounced", {
      bounce_reason: bounceReason.trim() || "Insufficient funds",
      bounce_charges: parseFloat(bounceCharges) || 0,
    });
  };

  const handleClearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeStatusUpdate("cleared", {
      cleared_date: clearedDate,
    });
  };

  const getVariant = (st: string) => {
    switch (st) {
      case "cleared":
        return "success";
      case "bounced":
        return "destructive";
      case "deposited":
      case "presented":
        return "info";
      case "stopped":
      case "cancelled":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="relative inline-block">
      {/* Clickable Badge Trigger (CH-5: One-tap status change) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={updating}
        className="inline-flex items-center gap-1 cursor-pointer hover:opacity-85 focus:outline-none"
        title="Tap to change cheque status"
      >
        <Badge variant={getVariant(cheque.status)} className="capitalize px-2.5 py-1 text-xs font-semibold gap-1">
          {cheque.status}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Badge>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-1 space-y-0.5 animate-in fade-in zoom-in-95">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Set Status
            </div>
            {allowedStatuses.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleSelectStatus(st)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left capitalize cursor-pointer transition-colors ${
                  st === cheque.status
                    ? "bg-zinc-100 dark:bg-zinc-800 font-bold text-indigo-600 dark:text-indigo-400"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {st}
                {st === cheque.status && <CheckCircle className="h-3 w-3 text-indigo-600" />}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Bounced Dialog (CH-7) */}
      <Dialog open={bounceDialogOpen} onOpenChange={setBounceDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Mark Cheque as Bounced
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleBounceSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bounce Reason *</label>
              <Input
                required
                placeholder="e.g. Insufficient funds, Signature mismatch"
                value={bounceReason}
                onChange={(e) => setBounceReason(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bank Bounce Charges (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={bounceCharges}
                onChange={(e) => setBounceCharges(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBounceDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={updating}>
                Confirm Bounce
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cleared Dialog (CH-7) */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              Mark Cheque as Cleared
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleClearSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cleared Date *</label>
              <Input
                type="date"
                required
                value={clearedDate}
                onChange={(e) => setClearedDate(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClearDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success" disabled={updating}>
                Confirm Cleared
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

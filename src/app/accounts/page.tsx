"use client";

import React, { useState, useEffect } from "react";
import { Plus, Landmark, Edit, Archive, CheckCircle2, ShieldCheck } from "lucide-react";
import { BankAccount, AccountType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate, toInputDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useGlobalAccount } from "@/components/navigation/global-account-context";

export default function BankAccountsPage() {
  const { refreshAccounts } = useGlobalAccount();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form fields
  const [nickname, setNickname] = useState("");
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("current");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [openingBalanceDate, setOpeningBalanceDate] = useState(toInputDate(new Date()));
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAllAccounts = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAccounts(data as BankAccount[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  const openAddDialog = () => {
    setEditingAccount(null);
    setNickname("");
    setBankName("");
    setBranch("");
    setIfsc("");
    setLastFourDigits("");
    setAccountType("current");
    setOpeningBalance("0");
    setOpeningBalanceDate(toInputDate(new Date()));
    setIsDefault(accounts.length === 0); // Default if first account
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (acc: BankAccount) => {
    setEditingAccount(acc);
    setNickname(acc.nickname);
    setBankName(acc.bank_name);
    setBranch(acc.branch || "");
    setIfsc(acc.ifsc || "");
    setLastFourDigits(acc.last_four_digits);
    setAccountType(acc.account_type);
    setOpeningBalance(acc.opening_balance.toString());
    setOpeningBalanceDate(acc.opening_balance_date);
    setIsDefault(acc.is_default);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate BA-6: exactly 4 digits
    if (!/^\d{4}$/.test(lastFourDigits.trim())) {
      setFormError("Account number must be exactly the last 4 digits (e.g. 1234)");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        nickname: nickname.trim(),
        bank_name: bankName.trim(),
        branch: branch.trim() || null,
        ifsc: ifsc.trim().toUpperCase() || null,
        last_four_digits: lastFourDigits.trim(),
        account_type: accountType,
        opening_balance: parseFloat(openingBalance) || 0,
        opening_balance_date: openingBalanceDate,
        is_default: isDefault,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from("bank_accounts")
          .update(payload)
          .eq("id", editingAccount.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("bank_accounts").insert([payload]);
        if (error) throw error;
      }

      await fetchAllAccounts();
      await refreshAccounts();
      setIsDialogOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save bank account");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async (acc: BankAccount) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bank_accounts")
        .update({ is_archived: !acc.is_archived, is_default: false })
        .eq("id", acc.id);

      if (!error) {
        await fetchAllAccounts();
        await refreshAccounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (acc: BankAccount) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bank_accounts")
        .update({ is_default: true })
        .eq("id", acc.id);

      if (!error) {
        await fetchAllAccounts();
        await refreshAccounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAccounts = accounts.filter((acc) =>
    showArchived ? true : !acc.is_archived
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-sm text-zinc-500">
            Manage your firm and personal bank accounts for issued & received cheques
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            Show Archived
          </label>

          <Button onClick={openAddDialog} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-zinc-500">Loading bank accounts...</div>
      ) : filteredAccounts.length === 0 ? (
        <Card className="text-center p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Landmark className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">No bank accounts found</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            Add your primary current or savings account to start recording cheques and computing balances.
          </p>
          <Button onClick={openAddDialog}>Add Your First Account</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => (
            <Card
              key={acc.id}
              className={acc.is_archived ? "opacity-60 border-dashed" : ""}
            >
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{acc.nickname}</CardTitle>
                    {acc.is_default && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Default
                      </Badge>
                    )}
                    {acc.is_archived && <Badge variant="secondary">Archived</Badge>}
                  </div>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {acc.bank_name} {acc.branch ? `• ${acc.branch}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="uppercase text-[10px]">
                  {acc.account_type.replace("_", "/")}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800 text-sm">
                  <span className="text-zinc-500">Account (Last 4 digits)</span>
                  <span className="font-mono font-medium">•••• {acc.last_four_digits}</span>
                </div>

                {acc.ifsc && (
                  <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800 text-sm">
                    <span className="text-zinc-500">IFSC Code</span>
                    <span className="font-mono text-xs">{acc.ifsc}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800 text-sm">
                  <span className="text-zinc-500">Opening Balance</span>
                  <div className="text-right">
                    <span className="font-semibold">{formatINR(acc.opening_balance)}</span>
                    <span className="block text-[11px] text-zinc-400">
                      As of {formatDate(acc.opening_balance_date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  {!acc.is_default && !acc.is_archived && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(acc)}
                      title="Set as Default Account"
                    >
                      Make Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(acc)}
                    className="gap-1"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleArchive(acc)}
                    className={acc.is_archived ? "text-indigo-600" : "text-zinc-500"}
                  >
                    <Archive className="h-3.5 w-3.5 mr-1" />
                    {acc.is_archived ? "Unarchive" : "Archive"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Bank Account" : "Add Bank Account"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-300">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nickname / Account Label *</label>
              <Input
                required
                placeholder="e.g. HDFC Current, SBI Shop"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bank Name *</label>
                <Input
                  required
                  placeholder="e.g. HDFC Bank, ICICI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Branch</label>
                <Input
                  placeholder="e.g. Ring Road, Surat"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Last 4 Digits *</label>
                <Input
                  required
                  maxLength={4}
                  pattern="\d{4}"
                  inputMode="numeric"
                  placeholder="e.g. 5678"
                  value={lastFourDigits}
                  onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, ""))}
                />
                <span className="text-[11px] text-zinc-500">Only last 4 digits stored for safety</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Account Type *</label>
                <Select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                >
                  <option value="current">Current</option>
                  <option value="savings">Savings</option>
                  <option value="od_cc">OD / CC</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">IFSC Code (Optional)</label>
              <Input
                placeholder="e.g. HDFC0001234"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                maxLength={11}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Opening Balance (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Opening Date</label>
                <Input
                  type="date"
                  value={openingBalanceDate}
                  onChange={(e) => setOpeningBalanceDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefaultAccount"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="isDefaultAccount" className="text-sm font-medium cursor-pointer">
                Set as default bank account for new entries
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingAccount ? "Save Changes" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


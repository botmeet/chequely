"use client";

import React, { useState, useEffect } from "react";
import { Plus, Users, Search, Edit, Trash2, Phone, FileText, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import Link from "next/link";
import { Party, PartyType, PartyOutstandingView } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [outstandingData, setOutstandingData] = useState<Record<number, PartyOutstandingView>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [name, setName] = useState("");
  const [partyType, setPartyType] = useState<PartyType>("customer");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .eq("is_deleted", false)
        .order("name", { ascending: true });

      if (!error && data) {
        setParties(data as Party[]);
      }

      // Fetch outstanding balances from party_outstanding view
      const { data: outData } = await supabase.from("party_outstanding").select("*");
      if (outData) {
        const map: Record<number, PartyOutstandingView> = {};
        outData.forEach((row: PartyOutstandingView) => {
          map[row.party_id] = row;
        });
        setOutstandingData(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const openAddDialog = () => {
    setEditingParty(null);
    setName("");
    setPartyType("customer");
    setPhone("");
    setGstin("");
    setAddress("");
    setNotes("");
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (p: Party) => {
    setEditingParty(p);
    setName(p.name);
    setPartyType(p.party_type);
    setPhone(p.phone || "");
    setGstin(p.gstin || "");
    setAddress(p.address || "");
    setNotes(p.notes || "");
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setFormError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        name: name.trim(),
        party_type: partyType,
        phone: phone.trim() || null,
        gstin: gstin.trim().toUpperCase() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingParty) {
        const { error } = await supabase
          .from("parties")
          .update(payload)
          .eq("id", editingParty.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("parties").insert([payload]);
        if (error) throw error;
      }

      await fetchParties();
      setIsDialogOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save party");
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async (party: Party) => {
    if (!confirm(`Are you sure you want to delete ${party.name}?`)) return;

    try {
      const supabase = createClient();
      // Check if party has existing cheques or bills
      const { count: chequeCount } = await supabase
        .from("cheques")
        .select("id", { count: "exact", head: true })
        .eq("party_id", party.id);

      const { count: billCount } = await supabase
        .from("bills")
        .select("id", { count: "exact", head: true })
        .eq("party_id", party.id);

      if ((chequeCount ?? 0) > 0 || (billCount ?? 0) > 0) {
        // PT-3: A party with entries cannot be permanently removed - soft delete only
        const { error } = await supabase
          .from("parties")
          .update({ is_deleted: true })
          .eq("id", party.id);
        if (error) throw error;
      } else {
        // Can delete directly
        const { error } = await supabase
          .from("parties")
          .delete()
          .eq("id", party.id);
        if (error) throw error;
      }

      await fetchParties();
    } catch (err) {
      console.error(err);
      alert("Error deleting party");
    }
  };

  const filteredParties = parties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.includes(search)) ||
      (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase()));

    if (typeFilter === "all") return matchesSearch;
    return matchesSearch && (p.party_type === typeFilter || p.party_type === "both");
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parties</h1>
          <p className="text-sm text-zinc-500">
            Customers, suppliers, and contacts you issue or receive cheques from
          </p>
        </div>

        <Button onClick={openAddDialog} className="flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Party
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search party by name, phone, or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Party Types</option>
            <option value="customer">Customers Only</option>
            <option value="supplier">Suppliers Only</option>
            <option value="both">Both</option>
          </Select>
        </div>
      </div>

      {/* Party Cards List */}
      {loading ? (
        <div className="p-8 text-center text-sm text-zinc-500">Loading parties...</div>
      ) : filteredParties.length === 0 ? (
        <Card className="text-center p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">No parties found</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            Add parties to start recording bills and linking cheques.
          </p>
          <Button onClick={openAddDialog}>Add Your First Party</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParties.map((p) => {
            const out = outstandingData[p.id];
            const receivable = out?.total_receivable || 0;
            const payable = out?.total_payable || 0;

            return (
              <Card key={p.id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    {p.phone && (
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {p.phone}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="capitalize text-[11px]">
                    {p.party_type}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-3">
                  {p.gstin && (
                    <div className="text-xs text-zinc-500 font-mono">
                      GSTIN: {p.gstin}
                    </div>
                  )}

                  {/* Outstanding Ledger Summary */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
                        Receivable
                      </span>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">
                        {formatINR(receivable)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-amber-600" />
                        Payable
                      </span>
                      <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm mt-0.5">
                        {formatINR(payable)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Link
                      href={`/reports/ledger?party_id=${p.id}`}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      View Ledger
                    </Link>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(p)}
                        className="h-8 px-2"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSoftDelete(p)}
                        className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Party Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingParty ? "Edit Party" : "Add Party"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-300">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Party / Company Name *</label>
              <Input
                required
                placeholder="e.g. Ramesh Bhai & Sons"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Party Type *</label>
                <Select
                  value={partyType}
                  onChange={(e) => setPartyType(e.target.value as PartyType)}
                >
                  <option value="customer">Customer (Debtor)</option>
                  <option value="supplier">Supplier (Creditor)</option>
                  <option value="both">Both</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  placeholder="e.g. 9825012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">GSTIN (Optional)</label>
              <Input
                placeholder="e.g. 24AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                maxLength={15}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Address</label>
              <Input
                placeholder="City, Market or Full Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes / Remarks</label>
              <Input
                placeholder="Any relevant reference or payment terms"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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
                {saving ? "Saving..." : editingParty ? "Save Changes" : "Create Party"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


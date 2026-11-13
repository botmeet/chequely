"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { Party, PartyType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface PartySelectProps {
  value: number | string | null;
  onChange: (partyId: number) => void;
  filterType?: PartyType | "all";
  placeholder?: string;
  required?: boolean;
}

export function PartySelect({
  value,
  onChange,
  filterType = "all",
  placeholder = "Select or search party...",
  required = false,
}: PartySelectProps) {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Quick Add Party Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<PartyType>("both");
  const [newPhone, setNewPhone] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [savingParty, setSavingParty] = useState(false);

  const fetchParties = async () => {
    try {
      const supabase = createClient();
      let query = supabase
        .from("parties")
        .select("*")
        .eq("is_deleted", false)
        .order("name", { ascending: true });

      const { data, error } = await query;
      if (!error && data) {
        setParties(data as Party[]);
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

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSavingParty(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("parties")
        .insert([
          {
            user_id: user.id,
            name: newName.trim(),
            party_type: newType,
            phone: newPhone.trim() || null,
            gstin: newGstin.trim().toUpperCase() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await fetchParties();
        onChange(data.id);
        setIsAddOpen(false);
        setIsOpen(false);
        setNewName("");
        setNewPhone("");
        setNewGstin("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create party");
    } finally {
      setSavingParty(false);
    }
  };

  const filteredParties = parties.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (filterType === "all") return matchesSearch;
    if (filterType === "customer") return matchesSearch && (p.party_type === "customer" || p.party_type === "both");
    if (filterType === "supplier") return matchesSearch && (p.party_type === "supplier" || p.party_type === "both");
    return matchesSearch;
  });

  const selectedParty = parties.find((p) => p.id === Number(value));

  return (
    <div className="relative w-full">
      {/* Combobox Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
      >
        <span className={selectedParty ? "font-medium" : "text-zinc-400"}>
          {selectedParty ? `${selectedParty.name} (${selectedParty.party_type})` : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 text-zinc-400 shrink-0" />
      </button>

      {/* Hidden input to enforce native required form validation */}
      {required && (
        <input
          type="text"
          required
          value={value ? String(value) : ""}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden p-2 space-y-2">
            <Input
              type="text"
              autoFocus
              placeholder="Type party name to filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm"
            />

            <div className="max-h-56 overflow-y-auto space-y-1">
              {filteredParties.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                    <span className="text-xs text-zinc-400 ml-2 capitalize">[{p.party_type}]</span>
                  </div>
                  {p.id === Number(value) && <Check className="h-4 w-4 text-indigo-600" />}
                </button>
              ))}

              {filteredParties.length === 0 && (
                <div className="p-3 text-center text-xs text-zinc-500">
                  No party matching &quot;{search}&quot;
                </div>
              )}
            </div>

            {/* Inline Add Party Trigger (PT-2: "add new party available inline") */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setNewName(search);
                  setIsAddOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add &quot;{search || "New Party"}&quot;
              </button>
            </div>
          </div>
        </>
      )}

      {/* Inline Quick Add Party Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Party</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateParty} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Party Name *</label>
              <Input
                required
                placeholder="Business or Person Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Party Type *</label>
                <Select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as PartyType)}
                >
                  <option value="both">Both (Customer & Vendor)</option>
                  <option value="customer">Customer (Debtor)</option>
                  <option value="supplier">Supplier / Vendor (Creditor)</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">GSTIN (Optional)</label>
              <Input
                placeholder="e.g. 24AAAAA0000A1Z5"
                value={newGstin}
                onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
                maxLength={15}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={savingParty}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingParty}>
                {savingParty ? "Saving..." : "Create & Select"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


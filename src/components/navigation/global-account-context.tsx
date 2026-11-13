"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { BankAccount } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface GlobalAccountContextType {
  selectedAccountId: string; // 'all' or string number
  setSelectedAccountId: (id: string) => void;
  accounts: BankAccount[];
  refreshAccounts: () => Promise<void>;
  loading: boolean;
}

const GlobalAccountContext = createContext<GlobalAccountContextType | undefined>(undefined);

export function GlobalAccountProvider({ children }: { children: React.ReactNode }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_archived", false)
        .order("is_default", { ascending: false })
        .order("nickname", { ascending: true });

      if (!error && data) {
        setAccounts(data as BankAccount[]);
      }
    } catch (err) {
      console.error("Failed to load accounts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <GlobalAccountContext.Provider
      value={{
        selectedAccountId,
        setSelectedAccountId,
        accounts,
        refreshAccounts: fetchAccounts,
        loading,
      }}
    >
      {children}
    </GlobalAccountContext.Provider>
  );
}

export function useGlobalAccount() {
  const context = useContext(GlobalAccountContext);
  if (!context) {
    throw new Error("useGlobalAccount must be used within GlobalAccountProvider");
  }
  return context;
}


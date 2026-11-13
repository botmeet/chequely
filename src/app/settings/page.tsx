"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { User, Building, Landmark, Lock, Save, ShieldCheck } from "lucide-react";
import { Profile, BankAccount } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useGlobalAccount } from "@/components/navigation/global-account-context";
import { PixelThemeSettings } from "@/components/theme/pixel-theme-settings";

export default function SettingsPage() {
  const { accounts, refreshAccounts } = useGlobalAccount();

  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [defaultAccountId, setDefaultAccountId] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setEmail(user.email || "");

          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (profile) {
            setBusinessName(profile.business_name || "");
            setGstin(profile.gstin || "");
          }

          const defaultAcc = accounts.find((a) => a.is_default);
          if (defaultAcc) {
            setDefaultAccountId(defaultAcc.id.toString());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [accounts]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // Update or insert profile (AU-6)
      const { error: pErr } = await supabase.from("profiles").upsert({
        user_id: user.id,
        business_name: businessName.trim() || null,
        gstin: gstin.trim().toUpperCase() || null,
      });

      if (pErr) throw pErr;

      // Update default account (BA-4)
      if (defaultAccountId) {
        await supabase
          .from("bank_accounts")
          .update({ is_default: true })
          .eq("id", parseInt(defaultAccountId));

        await refreshAccounts();
      }

      setProfileMessage("Profile and settings saved successfully!");
    } catch (err: unknown) {
      setProfileMessage(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      setPasswordMessage("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordMessage(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Preferences</h1>
        <p className="text-sm text-zinc-500">
          Customize your AOSP theme colors, display mode, business profile, and security
        </p>
      </div>

      {/* AOSP / Pixel UI Theme & Color Settings */}
      <PixelThemeSettings />

      {/* Business Profile (AU-6, BA-4) */}
      <Card>
        <form onSubmit={handleSaveProfile}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4 text-indigo-600" />
              Business Profile
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {profileMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  profileMessage.includes("success")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {profileMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Account Email</label>
              <Input disabled value={email} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Business / Proprietor Name</label>
              <Input
                placeholder="e.g. Acme Traders"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
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
              <label className="text-sm font-medium">Default Bank Account (BA-4)</label>
              <Select
                value={defaultAccountId}
                onChange={(e) => setDefaultAccountId(e.target.value)}
              >
                <option value="">-- None Selected --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id.toString()}>
                    {acc.nickname} — {acc.bank_name} (..{acc.last_four_digits})
                  </option>
                ))}
              </Select>
              <span className="text-[11px] text-zinc-400">
                Automatically selected when creating new issued cheques
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-zinc-100 dark:border-zinc-800 p-4">
            <Button type="submit" disabled={savingProfile} className="gap-1.5">
              <Save className="h-4 w-4" />
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Change Password */}
      <Card>
        <form onSubmit={handleUpdatePassword}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-600" />
              Change Password
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {passwordMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  passwordMessage.includes("success")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {passwordMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-zinc-100 dark:border-zinc-800 p-4">
            <Button type="submit" disabled={savingPassword} variant="outline">
              {savingPassword ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* About & Developer Info */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative h-12 w-12 rounded-2xl overflow-hidden bg-zinc-950 p-1 ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-sm shrink-0">
              <Image
                src="/logo.png"
                alt="Chequely Logo"
                width={48}
                height={48}
                className="object-contain h-full w-full"
              />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Chequely
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  v1.0.0
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Personal Cheque & Bill Tracker with AOSP Dynamic Theme
              </p>
            </div>
          </div>

          <a
            href="https://www.linkedin.com/in/meet-hirpara/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 shadow-xs transition-all hover:scale-105 active:scale-95"
          >
            <svg className="h-4 w-4 fill-current text-[#0a66c2]" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.8v8.37h-2.8V10.9M7.86 6.54a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26Z" />
            </svg>
            <span>Made by Meet Hirpara</span>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}


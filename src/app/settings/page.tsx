"use client";

import React, { useState, useEffect } from "react";
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
    </div>
  );
}


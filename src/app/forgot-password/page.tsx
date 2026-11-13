"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Password reset instructions have been sent to your email.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[90vh] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 p-1.5 shadow-md ring-1 ring-zinc-200/60 dark:ring-zinc-800">
            <Image
              src="/logo.png"
              alt="Chequely Logo"
              width={64}
              height={64}
              className="h-full w-full object-contain rounded-xl"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your email to receive password reset link
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-4 text-center space-y-3">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">{success}</p>
              <Link href="/login">
                <Button variant="outline" className="mt-2">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <Input
                  type="email"
                  required
                  placeholder="owner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending link..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-zinc-100 dark:border-zinc-800 p-4">
          <Link href="/login" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}


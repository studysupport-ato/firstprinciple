"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const recovery = searchParams.get("recovery") === "1";
    const linkError = searchParams.get("error");

    if (linkError) {
      setIsRecoveryReady(false);
      setIsCheckingRecovery(false);
      setError("This password reset link is invalid or has expired. Please request a new one.");
      return;
    }

    if (!code && !recovery) {
      setIsRecoveryReady(false);
      setIsCheckingRecovery(false);
      return;
    }

    let active = true;
    setError(null);
    setIsCheckingRecovery(true);
    const finalizeRecovery = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!data.session) {
            throw new Error("The verified recovery session is missing. Please request a new reset link.");
          }
        }

        if (active) setIsRecoveryReady(true);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to verify reset link.";
        if (active) {
          setIsRecoveryReady(false);
          setError(message);
        }
      } finally {
        if (active) setIsCheckingRecovery(false);
      }
    };

    void finalizeRecovery();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result: { message?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Password reset is temporarily unavailable. Please try again later.");
      }

      setStatus(result.message ?? "If an account matches that email, a password reset link will be sent shortly.");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Password reset is temporarily unavailable. Please try again later.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw updateError;
      }

      setStatus("Your password has been updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      setIsRecoveryReady(false);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to update password.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F4] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.04)] sm:p-8">
        <div className="mb-6">
          <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.22em] text-[#666666]">Account access</p>
          <h1 className="mt-3 font-serif text-4xl text-[#111111]">
            {isRecoveryReady ? "Set a new password" : "Reset your password"}
          </h1>
        </div>

        {status ? (
          <div className="mb-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm text-[#166534]">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">
            {error}
          </div>
        ) : null}

        {isCheckingRecovery ? (
          <p role="status" className="text-sm text-[#666666]">Verifying your password reset link...</p>
        ) : isRecoveryReady ? (
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#666666]">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none focus:border-[#111111]"
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#666666]">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none focus:border-[#111111]"
                placeholder="Repeat your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Updating password..." : "Update password"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <div className="space-y-2">
              <label htmlFor="reset-email" className="text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#666666]">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none focus:border-[#111111]"
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending reset email..." : "Send reset email"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-[#666666]">
          <Link href="/" className="font-medium text-[#111111] underline-offset-2 hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F7F7F4] text-sm text-[#666666]">Loading…</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

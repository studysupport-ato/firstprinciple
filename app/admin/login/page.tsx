"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

import { setAdminAuthenticated } from "@/lib/adminAuth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@back2basics.app");
  const [password, setPassword] = useState("back2basics");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Enter both the admin email and password.");
      return;
    }

    if (trimmedEmail === "admin@back2basics.app" && trimmedPassword === "back2basics") {
      setAdminAuthenticated(true);
      router.replace("/admin");
      return;
    }

    setError("Access denied. Use the local admin credentials.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#31414d] p-4 text-[#111111]">
      <div className="relative w-full max-w-[1180px] overflow-hidden rounded-[28px] border border-white/10 bg-[#f1f0ed] shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
        <div className="grid min-h-[620px] lg:grid-cols-[1.12fr_0.88fr]">
          <div className="relative overflow-hidden bg-[#0d141b] p-7 text-white md:p-8 lg:p-9">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_25%),linear-gradient(135deg,rgba(0,0,0,0.08),rgba(0,0,0,0.35))]" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-30" />
            <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#0d141b] via-[#0d141b]/80 to-transparent" />

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center gap-3">
                <BrandLogo className="h-14 w-64 rounded-xl shadow-sm" priority />
                <span className="sr-only">Back2Basics with Kwamina Admin portal</span>
              </div>

              <div className="mt-7 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e5e5e5]">
                  <ShieldCheck size={12} />
                  Secure access
                </div>

                <h1 className="max-w-[500px] font-serif text-[52px] leading-[0.9] tracking-[-0.065em] text-[#f5f3f2]">
                  Access the learning platform behind the curriculum.
                </h1>

                <p className="max-w-[420px] text-[15px] leading-7 text-[#d6d3d1]">
                  Manage content, assessments, and academic structure for the Back2Basics with Kwamina learning experience.
                </p>
              </div>

              <div className="mt-auto space-y-2.5 pt-6 text-[18px] text-[#f2f1f0]">
                {[
                  { icon: BookOpenCheck, label: "Editorial course and lesson operations" },
                  { icon: Sparkles, label: "Local-only academic content management" },
                  { icon: ShieldCheck, label: "Platform configuration and administration" },
                ].map(({ icon: Icon, label }, index) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/90">
                      <Icon size={16} />
                    </div>
                    <div className="flex items-center gap-3 text-[14px] text-[#f3f1ee]">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-transparent text-[11px] font-medium text-white/80">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex items-center bg-[#efece8] p-6 md:p-7 lg:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-bl-[80px] bg-white/40" />

            <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-[400px] space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#666666]">
                  <Lock size={12} />
                  Sign in
                </div>
                <h2 className="font-serif text-[44px] leading-[0.9] tracking-[-0.05em] text-[#111111]">Welcome back</h2>
              </div>

              <p className="text-[14px] text-[#5f5b57]">Enter your credentials to access the admin portal.</p>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.24em] text-[#666666]">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-[#d8d5d1] bg-white/80 py-2.5 pl-10 pr-3 text-[16px] text-[#111111] outline-none placeholder:text-[#8a847d]"
                    placeholder="admin@back2basics.app"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.24em] text-[#666666]">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-[#d8d5d1] bg-white/80 py-2.5 pl-10 pr-11 text-[16px] text-[#111111] outline-none placeholder:text-[#8a847d]"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#666666] transition hover:bg-[#f0eee9]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-[#F2C3C3] bg-[#FFF5F5] px-3 py-2 text-sm text-[#7A1F1F]">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-base font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-[#1d1d1d]"
              >
                Continue to admin
                <ArrowRight size={18} />
              </button>

              <div className="rounded-2xl border border-[#dfe0df] bg-white/55 px-3 py-3 text-[12px] text-[#666666]">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#c7c3bf] text-[10px]">i</span>
                  <span>Demo credentials: admin@back2basics.app / back2basics</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

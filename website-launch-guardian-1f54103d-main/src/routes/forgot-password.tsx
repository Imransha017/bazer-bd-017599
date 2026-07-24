import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, Lock, Eye, EyeOff, Clock, CheckCircle2, XCircle, RefreshCw, Search } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset, checkPasswordResetStatus } from "@/lib/password-reset.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — Bazar BD" },
      { name: "description", content: "Reset your Bazar BD account password using phone or email." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
});

function formatPhoneInput(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(3);
  if (d.length > 0 && d[0] !== "0") d = "0" + d;
  d = d.slice(0, 11);
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
}

function ForgotPasswordPage() {
  const [tab, setTab] = useState<"request" | "status">("request");
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "phone" | "email">(null);
  const [statusRows, setStatusRows] = useState<Array<{ id: string; status: string; admin_note: string | null; created_at: string; reviewed_at: string | null }> | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusIdent, setStatusIdent] = useState(""); // stored identifier used for auto-poll

  const submitReset = useServerFn(requestPasswordReset);
  const checkStatus = useServerFn(checkPasswordResetStatus);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = /^01[3-9]\d{8}$/.test(phoneDigits);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (method === "email") {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast.error("সঠিক ইমেইল দিন");
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      setDone("email");
      return;
    }
    // Phone flow
    if (!phoneValid) return toast.error("সঠিক বাংলাদেশি মোবাইল নম্বর দিন");
    if (password.length < 6) return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
    if (password !== confirm) return toast.error("পাসওয়ার্ড মিলছে না");
    setBusy(true);
    try {
      await submitReset({ data: { method: "phone", identifier: phoneDigits, newPassword: password } });
      setStatusIdent(phoneDigits);
      setDone("phone");
      // Fetch initial status immediately
      void refreshStatus(phoneDigits, "phone");
    } catch (err: any) {
      toast.error(err?.message || "রিকোয়েস্ট জমা দিতে সমস্যা হয়েছে");
    } finally {
      setBusy(false);
    }
  }

  async function refreshStatus(identifier: string, m: "phone" | "email", silent = false) {
    if (!identifier) return;
    if (!silent) setStatusBusy(true);
    try {
      const res = await checkStatus({ data: { method: m, identifier } });
      setStatusRows(res.requests);
    } catch (err: any) {
      if (!silent) toast.error(err?.message || "স্ট্যাটাস আনতে সমস্যা হয়েছে");
    } finally {
      if (!silent) setStatusBusy(false);
    }
  }

  // Auto-poll every 15s while on the phone "done" screen with a pending request
  useEffect(() => {
    if (done !== "phone" || !statusIdent) return;
    const hasPending = statusRows?.some((r) => r.status === "pending");
    if (!hasPending) return;
    const t = setInterval(() => { void refreshStatus(statusIdent, "phone", true); }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, statusIdent, statusRows]);

  async function onStatusLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid) return toast.error("সঠিক বাংলাদেশি মোবাইল নম্বর দিন");
    setStatusIdent(phoneDigits);
    await refreshStatus(phoneDigits, "phone");
  }

  if (done === "email") {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="rounded-lg border bg-card p-6 shadow-card">
            <Mail className="mx-auto mb-3 size-10 text-primary" />
            <h1 className="text-xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              আমরা আপনার ইমেইলে একটি পাসওয়ার্ড রিসেট লিংক পাঠিয়েছি। ইনবক্স/স্প্যাম চেক করুন।
            </p>
            <Link to="/auth" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
              ← Back to Login
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (done === "phone") {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="rounded-lg border bg-card p-6 shadow-card">
            <div className="text-center">
              <Phone className="mx-auto mb-3 size-10 text-primary" />
              <h1 className="text-xl font-bold">রিকোয়েস্ট জমা হয়েছে ✅</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                অ্যাডমিন অনুমোদনের পর নতুন পাসওয়ার্ডে লগইন করতে পারবেন। এই পেজেই স্ট্যাটাস আপডেট হবে (প্রতি ১৫ সেকেন্ডে অটো-রিফ্রেশ)।
              </p>
            </div>

            <StatusList
              rows={statusRows}
              busy={statusBusy}
              onRefresh={() => refreshStatus(statusIdent, "phone")}
            />

            <div className="mt-5 flex items-center justify-between text-xs">
              <Link to="/auth" className="font-semibold text-primary hover:underline">← Back to Login</Link>
              <button
                type="button"
                onClick={() => { setDone(null); setPassword(""); setConfirm(""); }}
                className="text-muted-foreground hover:text-foreground"
              >
                নতুন রিকোয়েস্ট
              </button>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="min-h-[calc(100vh-200px)] bg-gradient-to-b from-sky-50 to-background">
        <div className="mx-auto max-w-md px-4 py-6 md:py-12">
          <Link to="/auth" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to Login
          </Link>
          <div className="overflow-hidden rounded-lg bg-card shadow-card">
            <div className="bg-gradient-brand px-6 py-5 text-brand-foreground">
              <h1 className="text-2xl font-extrabold">Forgot Password?</h1>
              <p className="text-sm opacity-90">Reset via phone or email</p>
            </div>

            <div className="p-5">
              <div className="mb-3 flex rounded-md border p-1">
                <button
                  type="button"
                  onClick={() => setTab("request")}
                  className={`flex-1 rounded py-1.5 text-xs font-semibold transition ${tab === "request" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  Reset Request
                </button>
                <button
                  type="button"
                  onClick={() => setTab("status")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs font-semibold transition ${tab === "status" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  <Search className="size-3.5" /> Check Status
                </button>
              </div>

              {tab === "status" ? (
                <form onSubmit={onStatusLookup} className="space-y-3">
                  <p className="rounded-md bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
                    আপনার ফোন নম্বর দিয়ে সাম্প্রতিক পাসওয়ার্ড রিসেট রিকোয়েস্টের স্ট্যাটাস দেখুন।
                  </p>
                  <div className="relative flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm font-medium text-muted-foreground">🇧🇩 +880</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      className={`w-full rounded-r-md border bg-background py-2.5 px-3 text-sm outline-none focus:ring-1 ${
                        phone && !phoneValid ? "border-destructive focus:ring-destructive" : phoneValid ? "border-green-500 focus:ring-green-500" : "focus:border-primary focus:ring-primary"
                      }`}
                      placeholder="01XXX-XXXXXX"
                      maxLength={12}
                    />
                  </div>
                  <button
                    disabled={statusBusy}
                    type="submit"
                    className="w-full rounded-md bg-gradient-brand py-3 text-sm font-bold text-brand-foreground shadow transition hover:opacity-95 disabled:opacity-60"
                  >
                    {statusBusy ? "Loading…" : "Check Status"}
                  </button>
                  {statusRows !== null && (
                    <StatusList
                      rows={statusRows}
                      busy={statusBusy}
                      onRefresh={() => refreshStatus(statusIdent || phoneDigits, "phone")}
                    />
                  )}
                </form>
              ) : (
                <>
                  <div className="mb-4 flex rounded-md border p-1">
                    <button
                      type="button"
                      onClick={() => setMethod("phone")}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition ${method === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      <Phone className="size-3.5" /> Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("email")}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition ${method === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      <Mail className="size-3.5" /> Email
                    </button>
                  </div>

                  {method === "phone" ? (
                    <p className="mb-3 rounded-md bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                      <strong>নোট:</strong> ফোন নম্বরে পাসওয়ার্ড রিসেট রিকোয়েস্ট অ্যাডমিন যাচাই করে অনুমোদন দেবেন। অনুমোদনের পরই নতুন পাসওয়ার্ড কার্যকর হবে।
                    </p>
                  ) : (
                    <p className="mb-3 rounded-md bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-800">
                      আপনার ইমেইলে একটি রিসেট লিংক পাঠানো হবে। লিংকে ক্লিক করে নতুন পাসওয়ার্ড সেট করতে পারবেন।
                    </p>
                  )}

                  <form onSubmit={onSubmit} className="space-y-3">
                    {method === "phone" ? (
                      <div className="relative flex">
                        <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm font-medium text-muted-foreground">🇧🇩 +880</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          required
                          value={phone}
                          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                          className={`w-full rounded-r-md border bg-background py-2.5 px-3 text-sm outline-none focus:ring-1 ${
                            phone && !phoneValid ? "border-destructive focus:ring-destructive" : phoneValid ? "border-green-500 focus:ring-green-500" : "focus:border-primary focus:ring-primary"
                          }`}
                          placeholder="01XXX-XXXXXX"
                          maxLength={12}
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-md border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          placeholder="আপনার ইমেইল"
                        />
                      </div>
                    )}

                    {method === "phone" && (
                      <>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type={showPass ? "text" : "password"}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-md border bg-background py-2.5 pl-9 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="নতুন পাসওয়ার্ড"
                          />
                          <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type={showPass ? "text" : "password"}
                            required
                            minLength={6}
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full rounded-md border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="পাসওয়ার্ড কনফার্ম"
                          />
                        </div>
                      </>
                    )}

                    <button
                      disabled={busy}
                      type="submit"
                      className="w-full rounded-md bg-gradient-brand py-3 text-sm font-bold text-brand-foreground shadow transition hover:opacity-95 disabled:opacity-60"
                    >
                      {busy ? "Please wait…" : method === "phone" ? "Submit Reset Request" : "Send Reset Email"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function StatusList({
  rows,
  busy,
  onRefresh,
}: {
  rows: Array<{ id: string; status: string; admin_note: string | null; created_at: string; reviewed_at: string | null }> | null;
  busy: boolean;
  onRefresh: () => void;
}) {
  if (rows === null) return null;
  if (rows.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
        এই নম্বরে কোনো রিসেট রিকোয়েস্ট পাওয়া যায়নি।
        <div className="mt-2">
          <button type="button" onClick={onRefresh} disabled={busy} className="inline-flex items-center gap-1 text-primary hover:underline">
            <RefreshCw className={`size-3 ${busy ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground">রিকোয়েস্ট হিস্ট্রি</h2>
        <button type="button" onClick={onRefresh} disabled={busy} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-60">
          <RefreshCw className={`size-3 ${busy ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {rows.map((r) => {
        const style =
          r.status === "pending"
            ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: <Clock className="size-4" />, label: "Pending — অ্যাডমিন যাচাই করছেন" }
            : r.status === "used" || r.status === "approved"
              ? { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icon: <CheckCircle2 className="size-4" />, label: "Approved ✅ — নতুন পাসওয়ার্ড দিয়ে লগইন করুন" }
              : r.status === "rejected"
                ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: <XCircle className="size-4" />, label: "Rejected ❌ — অনুমোদন হয়নি" }
                : { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", icon: <Clock className="size-4" />, label: r.status };
        return (
          <div key={r.id} className={`rounded-md border ${style.border} ${style.bg} p-3 text-xs ${style.text}`}>
            <div className="flex items-center gap-2 font-semibold">
              {style.icon}
              <span>{style.label}</span>
            </div>
            <div className="mt-1 text-[11px] opacity-80">
              জমা: {new Date(r.created_at).toLocaleString("bn-BD")}
              {r.reviewed_at && <> · রিভিউ: {new Date(r.reviewed_at).toLocaleString("bn-BD")}</>}
            </div>
            {r.admin_note && (
              <div className="mt-1 rounded bg-white/60 p-1.5 text-[11px]">
                <strong>অ্যাডমিন নোট:</strong> {r.admin_note}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

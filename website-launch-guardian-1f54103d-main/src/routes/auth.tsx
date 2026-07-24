import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Phone, Lock, ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { useAuth } from "@/lib/auth";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
    mode: s.mode === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Login / Sign Up — Bazar BD" },
      { name: "description", content: "Login or create a Bazar BD account to shop millions of products with fast delivery across Bangladesh." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp, user, loading } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">(search.mode as "login" | "signup");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agree, setAgree] = useState(true);
  const [busy, setBusy] = useState(false);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = /^01[3-9]\d{8}$/.test(phoneDigits);
  const phoneTouched = phone.length > 0;

  function phoneErrorMessage(d: string): string | null {
    if (d.length === 0) return "মোবাইল নম্বর দিন";
    if (d[0] !== "0") return `নম্বর অবশ্যই ০ দিয়ে শুরু হতে হবে — আপনি শুরু করেছেন ${d[0]} দিয়ে`;
    if (d.length >= 2 && d[1] !== "1") return `দ্বিতীয় ডিজিট ১ হতে হবে (০১ দিয়ে শুরু) — আপনি দিয়েছেন 0${d[1]}`;
    if (d.length < 11) return `নম্বর ১১ ডিজিট হতে হবে — এখন ${d.length} ডিজিট আছে, আরও ${11 - d.length} ডিজিট দিন`;
    if (d.length > 11) return `নম্বর ১১ ডিজিটের বেশি হতে পারবে না — এখন ${d.length} ডিজিট`;
    const third = d[2];
    if (!/[3-9]/.test(third)) return `তৃতীয় ডিজিট ৩–৯ হতে হবে (013–019 অপারেটর) — আপনি দিয়েছেন 01${third}`;
    return null;
  }
  const phoneError = phoneErrorMessage(phoneDigits);

  // Normalizes any input (paste w/ spaces/dashes/parens, +880/880/8801/1-prefix)
  // into local 11-digit BD format, capped at 11 digits, then pretty-formats.
  function normalizeBdDigits(raw: string) {
    let d = (raw || "").replace(/\D/g, "");
    // Strip common international prefixes
    if (d.startsWith("00880")) d = d.slice(5);
    else if (d.startsWith("880")) d = d.slice(3);
    // If it now starts with "1" and length looks like a mobile without leading 0, add it
    if (d.length > 0 && d[0] !== "0") d = "0" + d;
    // Collapse accidental multiple leading zeros ("001712..." → "01712...")
    d = d.replace(/^0+/, "0");
    return d.slice(0, 11);
  }
  function prettyPhone(d: string) {
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }
  function formatPhoneInput(raw: string) {
    return prettyPhone(normalizeBdDigits(raw));
  }

  // Caret-preserving handler: computes digit-index of caret, reformats, then
  // maps the caret back accounting for the auto-inserted dash after 5 digits.
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const rawValue = el.value;
    const rawCaret = el.selectionStart ?? rawValue.length;
    // Count digits before caret in the raw (pre-format) value
    let digitsBefore = 0;
    for (let i = 0; i < rawCaret && i < rawValue.length; i++) {
      if (/\d/.test(rawValue[i])) digitsBefore++;
    }
    const normalized = normalizeBdDigits(rawValue);
    // If normalization dropped a prefix (e.g. "+880"), clamp caret to new length
    digitsBefore = Math.min(digitsBefore, normalized.length);
    // Map digit-index → formatted-index (adds 1 for the dash after position 5)
    const formattedCaret = digitsBefore > 5 ? digitsBefore + 1 : digitsBefore;
    pendingCaret.current = formattedCaret;
    setPhone(prettyPhone(normalized));
  }
  function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // If user backspaces the dash, delete the digit before it instead
    if (e.key === "Backspace") {
      const el = e.currentTarget;
      const s = el.selectionStart ?? 0;
      const eSel = el.selectionEnd ?? 0;
      if (s === eSel && s > 0 && el.value[s - 1] === "-") {
        e.preventDefault();
        const newVal = el.value.slice(0, s - 2) + el.value.slice(s);
        const normalized = normalizeBdDigits(newVal);
        const digitsBefore = Math.max(0, s - 2 - (s - 2 > 5 ? 1 : 0));
        pendingCaret.current = digitsBefore > 5 ? digitsBefore + 1 : digitsBefore;
        setPhone(prettyPhone(normalized));
      }
    }
  }
  useLayoutEffect(() => {
    if (pendingCaret.current !== null && phoneInputRef.current) {
      const pos = Math.min(pendingCaret.current, phoneInputRef.current.value.length);
      try { phoneInputRef.current.setSelectionRange(pos, pos); } catch { /* ignore */ }
      pendingCaret.current = null;
    }
  }, [phone]);

  useEffect(() => {
    if (!loading && user) nav({ to: (search.redirect || "/") as string, replace: true });
  }, [loading, user, search.redirect, nav]);

  useEffect(() => {
    setMode(search.mode as "login" | "signup");
  }, [search.mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (method === "phone" && !phoneValid) {
      toast.error(phoneError || "সঠিক বাংলাদেশি মোবাইল নম্বর দিন");
      return;
    }
    const identifier = method === "email" ? email.trim() : `${phoneDigits}@phone.bazar.bd`;
    if (mode === "signup") {
      if (password.length < 6) return toast.error("Password must be at least 6 characters");
      if (password !== confirm) return toast.error("Passwords do not match");
      if (!agree) return toast.error("Please accept the Terms & Conditions");
    }
    setBusy(true);
    const res = mode === "login" ? await signIn(identifier, password) : await signUp(identifier, password);
    setBusy(false);
    if (res.error) {
      if (method === "phone" && /invalid|email/i.test(res.error)) {
        return toast.error("এই ফোন নম্বরে " + (mode === "login" ? "একাউন্ট নেই বা পাসওয়ার্ড ভুল" : "একাউন্ট খুলতে সমস্যা হচ্ছে"));
      }
      return toast.error(res.error);
    }
    if (mode === "signup") toast.success(method === "phone" ? "ফোন নম্বর দিয়ে একাউন্ট তৈরি হয়েছে ✅" : "Account created!");
    else toast.success("Welcome back to Bazar!");
    setTimeout(() => { window.location.href = (search.redirect || "/") as string; }, 50);
  }


  return (
    <SiteLayout>
      <div className="min-h-[calc(100vh-200px)] bg-gradient-to-b from-sky-50 to-background">
        {/* Mobile branded header */}
        <div className="bg-gradient-brand px-4 pb-8 pt-4 text-brand-foreground md:hidden">
          <Link to="/" className="inline-flex items-center gap-1 text-xs opacity-90">
            <ArrowLeft className="size-4" /> Back to Home
          </Link>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Trebuchet MS', system-ui, sans-serif" }}>Bazar</span>
            <span className="mb-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">bd</span>
          </div>
          <p className="mt-1 text-sm opacity-90">{mode === "login" ? "Welcome back!" : "Create a new account"}</p>
        </div>

        <div className="mx-auto max-w-md px-4 py-6 md:py-12">
          <div className="overflow-hidden rounded-lg bg-card shadow-card">
            {/* Desktop header */}
            <div className="hidden bg-gradient-brand px-6 py-5 text-brand-foreground md:block">
              <h1 className="text-2xl font-extrabold">Welcome to Bazar</h1>
              <p className="text-sm opacity-90">{mode === "login" ? "Sign in to continue shopping" : "Create your account in seconds"}</p>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 border-b bg-muted/30">
              <button
                onClick={() => setMode("login")}
                className={`py-3 text-sm font-bold transition ${mode === "login" ? "border-b-2 border-primary bg-card text-primary" : "text-muted-foreground"}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`py-3 text-sm font-bold transition ${mode === "signup" ? "border-b-2 border-primary bg-card text-primary" : "text-muted-foreground"}`}
              >
                Sign Up
              </button>
            </div>

            <div className="p-5">
              {/* Method switch */}
              <div className="mb-4 flex rounded-md border p-1">
                <button
                  type="button"
                  onClick={() => setMethod("email")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition ${method === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  <Mail className="size-3.5" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("phone")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition ${method === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  <Phone className="size-3.5" /> Phone
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-3">
                {method === "email" ? (
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Email address"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="relative flex">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm font-medium text-muted-foreground">🇧🇩 +880</span>
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={handlePhoneChange}
                        onKeyDown={handlePhoneKeyDown}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData("text");
                          const normalized = normalizeBdDigits(pasted);
                          pendingCaret.current = normalized.length > 5 ? normalized.length + 1 : normalized.length;
                          setPhone(prettyPhone(normalized));
                        }}
                        className={`w-full rounded-r-md border bg-background py-2.5 px-3 text-sm outline-none focus:ring-1 ${
                          phoneTouched && !phoneValid
                            ? "border-destructive focus:border-destructive focus:ring-destructive"
                            : phoneValid
                              ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                              : "focus:border-primary focus:ring-primary"
                        }`}
                        placeholder="01XXX-XXXXXX"
                        maxLength={12}
                        aria-invalid={phoneTouched && !phoneValid}
                      />
                    </div>
                    {phoneTouched && !phoneValid && (
                      <p className="mt-1 text-[11px] text-destructive">{phoneError || "সঠিক নম্বর দিন"}</p>
                    )}
                    {phoneValid && (
                      <p className="mt-1 text-[11px] text-green-600">✓ সঠিক বাংলাদেশি মোবাইল নম্বর</p>
                    )}
                  </div>
                )}

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border bg-background py-2.5 pl-9 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Password"
                  />
                  <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {mode === "signup" && (
                  <>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        minLength={6}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="w-full rounded-md border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="Confirm password"
                      />
                    </div>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
                      <span>
                        I agree to Bazar's <a className="text-primary hover:underline">Terms of Use</a> and <a className="text-primary hover:underline">Privacy Policy</a>
                      </span>
                    </label>
                  </>
                )}

                {mode === "login" && (
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
                  </div>
                )}

                <button
                  disabled={busy}
                  type="submit"
                  className="w-full rounded-md bg-gradient-brand py-3 text-sm font-bold text-brand-foreground shadow transition hover:opacity-95 disabled:opacity-60"
                >
                  {busy ? "Please wait…" : mode === "login" ? "LOGIN" : "CREATE ACCOUNT"}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or continue with</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={async () => { const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (r.error) toast.error((r.error as any).message || "Google sign-in failed"); else if (!r.redirected) window.location.href = search.redirect || "/"; }} className="flex items-center justify-center rounded-md border bg-card py-2.5 text-xs font-semibold hover:bg-muted">

                  <svg className="size-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                </button>
                <button type="button" disabled className="flex items-center justify-center rounded-md border bg-card py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  <svg className="size-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85V15.47H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96h-1.52c-1.49 0-1.95.93-1.95 1.87V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"/></svg>
                </button>
                <button type="button" disabled className="flex items-center justify-center rounded-md border bg-card py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.04c-.03-2.74 2.24-4.07 2.34-4.13-1.28-1.87-3.27-2.13-3.97-2.16-1.69-.17-3.3 1-4.16 1-.87 0-2.19-.97-3.6-.95-1.85.03-3.56 1.08-4.51 2.74-1.92 3.34-.49 8.27 1.39 10.97.92 1.32 2.01 2.81 3.42 2.76 1.37-.06 1.89-.89 3.55-.89 1.65 0 2.12.89 3.57.86 1.47-.03 2.41-1.35 3.31-2.68 1.04-1.54 1.47-3.03 1.5-3.11-.03-.01-2.87-1.1-2.9-4.36zM14.33 4.07c.76-.92 1.27-2.2 1.13-3.47-1.09.04-2.4.72-3.18 1.64-.7.81-1.31 2.11-1.15 3.36 1.21.09 2.45-.62 3.2-1.53z"/></svg>
                </button>
              </div>

              <p className="mt-5 text-center text-xs text-muted-foreground">
                {mode === "login" ? "New to Bazar?" : "Already have an account?"}{" "}
                <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="font-semibold text-primary hover:underline">
                  {mode === "login" ? "Create an account" : "Login"}
                </button>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
              <Link
                to="/become-vendor"
                className="flex items-center justify-center rounded-md border border-primary/40 bg-primary/5 py-2.5 text-xs font-bold text-primary hover:bg-primary/10"
              >
                Create Vendor Account
              </Link>
              <Link
                to="/dropshipping/apply"
                className="flex items-center justify-center rounded-md border border-amber-500/50 bg-amber-50 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
              >
                Dropshipping Account Create
              </Link>
            </div>
            </div>


          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            By continuing, you agree to Bazar's Terms of Use & Privacy Policy.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { useAuth } from "@/lib/auth";
import { applyAsDropshipper, getMyDropshipper, type Dropshipper } from "@/lib/dropshipper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Rocket, PartyPopper, Clock, XCircle, CheckCircle2, UserRound, Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/dropshipping/apply")({
  head: () => ({
    meta: [
      { title: "Start Dropshipping — Bazar BD" },
      { name: "description", content: "Create your dropshipping account and start earning by selling products with your own retail prices." },
    ],
  }),
  component: ApplyPage,
});

function ApplyPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [ds, setDs] = useState<Dropshipper | null | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bkash");
  const [payoutNumber, setPayoutNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);

  const draftKey = "dropshipping_application_draft";
  const draftExpKey = "dropshipping_application_draft_exp";

  useEffect(() => {
    if (loading) return;
    if (!user) { setDs(null); return; }
    getMyDropshipper().then(async (existing) => {
      if (existing) {
        setDs(existing);
        return;
      }
      if (draftApplied) {
        setDs(null);
        return;
      }
      const exp = Number(localStorage.getItem(draftExpKey) || 0);
      if (exp && exp < Date.now()) {
        localStorage.removeItem(draftKey);
        localStorage.removeItem(draftExpKey);
        setDs(null);
        return;
      }
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        setDs(null);
        return;
      }
      setDraftApplied(true);
      try {
        const draft = JSON.parse(raw) as Parameters<typeof applyAsDropshipper>[0];
        const created = await applyAsDropshipper(draft);
        localStorage.removeItem(draftKey);
        localStorage.removeItem(draftExpKey);
        toast.success("Dropshipping application submitted!");
        setDs(created);
      } catch (err) {
        toast.error((err as Error).message || "Please submit your dropshipping details again");
        setDs(null);
      }
    }).catch(() => setDs(null));
  }, [user, loading, draftApplied]);

  if (loading || ds === undefined) {
    return <SiteLayout><div className="p-16 text-center text-sm text-muted-foreground">Loading…</div></SiteLayout>;
  }

  if (!user) {
    const createAccountAndApply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fullName.trim() || !email.trim() || !storeName.trim() || !phone.trim() || !payoutNumber.trim()) {
        toast.error("Please fill all required account and store information");
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        toast.error("Enter a valid email address");
        return;
      }
      if (!/^01[3-9]\d{8}$/.test(phone.trim())) {
        toast.error("Enter a valid Bangladesh phone (e.g. 017XXXXXXXX)");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      const draft = {
        store_name: storeName,
        phone,
        whatsapp,
        bio,
        payout_method: payoutMethod,
        payout_number: payoutNumber,
      };

      setBusy(true);
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
        localStorage.setItem(draftExpKey, String(Date.now() + 7 * 86400_000));

        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        const alreadyExists = signUpErr && /registered|exists|already/i.test(signUpErr.message);
        const rateLimited = signUpErr && /security purposes|rate/i.test(signUpErr.message);
        if (signUpErr && !alreadyExists && !rateLimited) throw signUpErr;

        let session = signUpData?.session ?? null;
        if (!session) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInErr) {
            if (alreadyExists) {
              toast.error("এই ইমেইলে ইতিমধ্যে একাউন্ট আছে — সঠিক পাসওয়ার্ড দিন অথবা প্রথমে লগইন করুন");
            } else {
              toast.error(signInErr.message);
            }
            return;
          }
          session = signInData.session;
        }

        if (session) {
          const created = await applyAsDropshipper(draft);
          localStorage.removeItem(draftKey);
          localStorage.removeItem(draftExpKey);
          toast.success("Dropshipping account created. Please wait for approval.");
          setDs(created);
        } else {
          toast.success("Account created. Please verify/login to finish your dropshipping application.");
          nav({ to: "/auth", search: { mode: "login", redirect: "/dropshipping/apply" }, replace: true });
        }
      } catch (err) {
        toast.error((err as Error).message || "Failed to create dropshipping account");
      } finally {
        setBusy(false);
      }
    };

    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
          <ApplicationIntro />
          <form onSubmit={createAccountAndApply} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <h1 className="mb-1 text-2xl font-extrabold text-foreground">Create Dropshipping Account</h1>
            <p className="mb-5 text-sm text-muted-foreground">Create your login account and submit your dropshipping store details together.</p>

            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-foreground">Full name *</span>
                <div className="relative mt-1">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input required value={fullName} onChange={e => setFullName(e.target.value)} className="block w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" placeholder="Your name" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-foreground">Email *</span>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="block w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" placeholder="you@example.com" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-foreground">Password *</span>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" placeholder="Minimum 6 characters" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-foreground">Confirm password *</span>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input required minLength={6} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="block w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" placeholder="Retype password" />
                </div>
              </label>
            </div>

            <DropshipperFields
              storeName={storeName}
              setStoreName={setStoreName}
              phone={phone}
              setPhone={setPhone}
              whatsapp={whatsapp}
              setWhatsapp={setWhatsapp}
              payoutMethod={payoutMethod}
              setPayoutMethod={setPayoutMethod}
              payoutNumber={payoutNumber}
              setPayoutNumber={setPayoutNumber}
              bio={bio}
              setBio={setBio}
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted-foreground">Already have a login account? <Link to="/auth" search={{ mode: "login", redirect: "/dropshipping/apply" }} className="font-semibold text-primary hover:underline">Login here</Link>.</p>
              <button type="submit" disabled={busy} className="rounded-md bg-primary px-6 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy ? "Creating…" : "Create & submit"}</button>
            </div>
          </form>
        </div>
      </SiteLayout>
    );
  }

  if (ds) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg p-6">
          <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-amber-50 p-8 text-center shadow-lg">
            {ds.status === "pending" && <>
              <Clock className="mx-auto h-14 w-14 text-amber-600" />
              <h1 className="mt-4 text-2xl font-extrabold text-amber-800">Awaiting approval</h1>
              <p className="mt-2 text-sm text-foreground">Your dropshipping application is under review. You'll be notified once approved.</p>
            </>}
            {ds.status === "approved" && <>
              <PartyPopper className="mx-auto h-14 w-14 text-primary" />
              <h1 className="mt-4 text-2xl font-extrabold text-primary">You're approved! 🎉</h1>
              <p className="mt-2 text-sm text-foreground">Welcome to the Bazar BD dropshipping program. Head to your dashboard to import products and start earning.</p>
              <Link to="/dropshipping" className="mt-5 inline-block rounded bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">Open Dashboard</Link>
            </>}
            {ds.status === "rejected" && <>
              <XCircle className="mx-auto h-14 w-14 text-red-600" />
              <h1 className="mt-4 text-2xl font-extrabold text-red-800">Application rejected</h1>
              {ds.rejection_reason && <p className="mt-2 text-sm text-foreground">Reason: {ds.rejection_reason}</p>}
            </>}
            {ds.status === "suspended" && <>
              <XCircle className="mx-auto h-14 w-14 text-red-600" />
              <h1 className="mt-4 text-2xl font-extrabold text-red-800">Account suspended</h1>
              <p className="mt-2 text-sm text-foreground">Please contact support.</p>
            </>}
          </div>
        </div>
      </SiteLayout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !phone.trim() || !payoutNumber.trim()) {
      toast.error("Please fill store name, phone and payout number");
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(phone.trim())) {
      toast.error("Enter a valid Bangladesh phone (e.g. 017XXXXXXXX)");
      return;
    }
    setBusy(true);
    try {
      const created = await applyAsDropshipper({
        store_name: storeName, phone, whatsapp, bio,
        payout_method: payoutMethod, payout_number: payoutNumber,
      });
      toast.success("Application submitted!");
      setDs(created);
    } catch (err) {
      toast.error((err as Error).message || "Failed to submit");
    } finally { setBusy(false); }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <ApplicationIntro />

        <form onSubmit={submit} className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Application form</h2>
          <DropshipperFields
            storeName={storeName}
            setStoreName={setStoreName}
            phone={phone}
            setPhone={setPhone}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            payoutMethod={payoutMethod}
            setPayoutMethod={setPayoutMethod}
            payoutNumber={payoutNumber}
            setPayoutNumber={setPayoutNumber}
            bio={bio}
            setBio={setBio}
          />
          <div className="mt-5 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">By applying, you agree to our dropshipper terms.</p>
            <button type="submit" disabled={busy} className="rounded-md bg-primary px-6 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy ? "Submitting…" : "Submit application"}</button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}

function ApplicationIntro() {
  return (
    <div className="mb-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-amber-50 p-6 shadow">
      <div className="flex items-center gap-3">
        <Rocket className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Start your Dropshipping business</h1>
          <p className="text-sm text-muted-foreground">Sell any Bazar BD product at your own price. We handle stock, delivery & customer support — you earn the profit.</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 text-xs text-foreground sm:grid-cols-3">
        <li className="flex items-center gap-2 rounded-md bg-white/60 px-3 py-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Zero inventory cost</li>
        <li className="flex items-center gap-2 rounded-md bg-white/60 px-3 py-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Set your own retail price</li>
        <li className="flex items-center gap-2 rounded-md bg-white/60 px-3 py-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Instant share links</li>
      </ul>
    </div>
  );
}

function DropshipperFields({
  storeName,
  setStoreName,
  phone,
  setPhone,
  whatsapp,
  setWhatsapp,
  payoutMethod,
  setPayoutMethod,
  payoutNumber,
  setPayoutNumber,
  bio,
  setBio,
}: {
  storeName: string;
  setStoreName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  whatsapp: string;
  setWhatsapp: (value: string) => void;
  payoutMethod: string;
  setPayoutMethod: (value: string) => void;
  payoutNumber: string;
  setPayoutNumber: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-xs font-semibold text-foreground">Store name *</span>
        <input required value={storeName} onChange={e => setStoreName(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" placeholder="My Fashion Hub" />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-foreground">Phone *</span>
        <input required value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" placeholder="017XXXXXXXX" />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-foreground">WhatsApp</span>
        <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" placeholder="Optional" />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-foreground">Payout method *</span>
        <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm">
          <option value="bkash">bKash</option>
          <option value="nagad">Nagad</option>
          <option value="rocket">Rocket</option>
          <option value="bank">Bank Transfer</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-foreground">Payout number / account *</span>
        <input required value={payoutNumber} onChange={e => setPayoutNumber(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" placeholder="017XXXXXXXX" />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-semibold text-foreground">Short bio</span>
        <textarea value={bio} onChange={e => setBio(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" rows={3} placeholder="Tell customers about your store" />
      </label>
    </div>
  );
}

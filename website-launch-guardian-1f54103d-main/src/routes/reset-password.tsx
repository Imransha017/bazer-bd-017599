import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Eye, EyeOff } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — Bazar BD" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase places recovery access token in URL hash; getSession will pick it up automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর");
    if (password !== confirm) return toast.error("পাসওয়ার্ড মিলছে না");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("পাসওয়ার্ড আপডেট হয়েছে ✅");
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="overflow-hidden rounded-lg bg-card shadow-card">
          <div className="bg-gradient-brand px-6 py-5 text-brand-foreground">
            <h1 className="text-2xl font-extrabold">Set New Password</h1>
          </div>
          <div className="p-5">
            {!ready ? (
              <p className="rounded bg-amber-50 p-3 text-xs text-amber-800">
                রিসেট লিংক ভেরিফাই করা হচ্ছে… যদি এই পেজ ইমেইল রিসেট লিংক থেকে না আসে,{" "}
                <Link to="/forgot-password" className="font-semibold underline">নতুন লিংক নিন</Link>।
              </p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3">
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
                  <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
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
                <button disabled={busy} type="submit" className="w-full rounded-md bg-gradient-brand py-3 text-sm font-bold text-brand-foreground shadow disabled:opacity-60">
                  {busy ? "Please wait…" : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

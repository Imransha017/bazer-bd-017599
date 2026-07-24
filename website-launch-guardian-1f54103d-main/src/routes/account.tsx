import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, MapPin, Package, Heart, LogOut, Lock, Store, Handshake, Rocket, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyVendor, type Vendor } from "@/lib/vendor";
import { getMyDropshipper, type Dropshipper } from "@/lib/dropshipper";


export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account — Bazar" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState({ full_name: "", phone: "", date_of_birth: "", gender: "" });
  const [pwd, setPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [ds, setDs] = useState<Dropshipper | null>(null);


  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: "/account" } });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        date_of_birth: data.date_of_birth ?? "",
        gender: data.gender ?? "",
      });
    });
  }, [user]);

  useEffect(() => {
    if (!user) { setVendor(null); setDs(null); return; }
    getMyVendor().then(setVendor).catch(() => setVendor(null));
    getMyDropshipper().then(setDs).catch(() => setDs(null));
  }, [user]);


  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: profile.full_name,
      phone: profile.phone,
      date_of_birth: profile.date_of_birth || null,
      gender: profile.gender || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const changePwd = async () => {
    if (pwd.length < 8) return toast.error("Password must be 8+ characters");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPwd("");
  };

  if (loading || !user) return null;

  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-5xl gap-4 px-3 py-4 md:grid-cols-[220px_1fr] md:px-4 md:py-6">
        {/* Sidebar */}
        <aside className="rounded-md bg-card p-3 shadow-card">
          <div className="mb-3 flex items-center gap-2 border-b pb-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.full_name || user.email?.split("@")[0]}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            <Link to="/account" className="flex items-center gap-2 rounded bg-primary/10 px-2 py-2 font-medium text-primary">
              <User className="size-4" /> Profile
            </Link>
            <Link to="/account/addresses" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
              <MapPin className="size-4" /> Addresses
            </Link>
            <Link to="/orders" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
              <Package className="size-4" /> My Orders
            </Link>
            <Link to="/wishlist" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
              <Heart className="size-4" /> Wishlist
            </Link>
            <Link to="/affiliate" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
              <Handshake className="size-4" /> Affiliate Program
            </Link>
            {vendor ? (vendor.status === "approved" ? (
              <Link to="/vendor" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
                <Store className="size-4" /> Vendor Dashboard
              </Link>
            ) : (
              <Link to="/become-vendor" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
                <Store className="size-4" /> Vendor: <span className="capitalize">{vendor.status}</span>
              </Link>
            )) : (
              <Link to="/become-vendor" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
                <Store className="size-4" /> Create Vendor Account
              </Link>
            )}
            {ds ? (ds.status === "approved" ? (
              <Link to="/dropshipping" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
                <Rocket className="size-4" /> Dropshipping Dashboard
              </Link>
            ) : (
              <Link to="/dropshipping/apply" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
                <Rocket className="size-4" /> Dropshipper: <span className="capitalize">{ds.status}</span>
              </Link>
            )) : (
              <Link to="/dropshipping/apply" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
                <Rocket className="size-4" /> Start Dropshipping
              </Link>
            )}

            {isAdmin && (
              <Link to="/sys-x7k9-control" className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted">
                <LayoutDashboard className="size-4" /> Admin Panel
              </Link>
            )}
            <button onClick={async () => { await signOut(); nav({ to: "/" }); }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-destructive hover:bg-muted">
              <LogOut className="size-4" /> Sign Out
            </button>

          </nav>
        </aside>

        {/* Main */}
        <div className="space-y-4">
          <section className="rounded-md bg-card p-4 shadow-card">
            <h2 className="mb-3 text-base font-bold">Personal Information</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name">
                <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </Field>
              <Field label="Phone">
                <input value={profile.phone} maxLength={11} onChange={(e) => setProfile({ ...profile, phone: e.target.value.replace(/\D/g, "") })} placeholder="01XXXXXXXXX" className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={profile.date_of_birth} onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </Field>
              <Field label="Gender">
                <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
            <button onClick={save} disabled={saving} className="mt-4 rounded bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </section>

          <section className="rounded-md bg-card p-4 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><Lock className="size-4" /> Change Password</h2>
            <div className="flex gap-2">
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="New password (8+ chars)" className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={changePwd} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Update</button>
            </div>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

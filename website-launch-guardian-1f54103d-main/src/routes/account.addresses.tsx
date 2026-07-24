import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, Star, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BD_DISTRICTS, BD_LOCATIONS } from "@/lib/bd-locations";

type Address = {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  district: string;
  thana: string;
  address: string;
  is_default: boolean;
};

export const Route = createFileRoute("/account/addresses")({
  head: () => ({ meta: [{ title: "My Addresses — Bazar" }] }),
  component: AddressesPage,
});

const empty = { label: "Home", full_name: "", phone: "", district: "", thana: "", address: "", is_default: false };

function AddressesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [list, setList] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Partial<Address> | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: "/account/addresses" } });
  }, [loading, user, nav]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user || !editing) return;
    if (!editing.full_name || !editing.phone || !editing.district || !editing.thana || !editing.address) return toast.error("Please fill all fields");
    if (editing.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }
    const payload = { ...editing, user_id: user.id } as Omit<Address, "id"> & { id?: string; user_id: string };
    const { error } = editing.id
      ? await supabase.from("addresses").update(payload).eq("id", editing.id)
      : await supabase.from("addresses").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Address saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    await supabase.from("addresses").delete().eq("id", id);
    load();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    load();
  };

  if (loading || !user) return null;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-3 py-4 md:px-4 md:py-6">
        <div className="mb-4 flex items-center gap-2">
          <Link to="/account" className="text-muted-foreground hover:text-primary"><ChevronLeft className="size-5" /></Link>
          <h1 className="flex-1 text-xl font-bold">My Addresses</h1>
          <button onClick={() => setEditing(empty)} className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
            <Plus className="size-4" /> Add
          </button>
        </div>

        {list.length === 0 ? (
          <div className="rounded-md bg-card p-10 text-center shadow-card">
            <MapPin className="mx-auto size-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No saved addresses</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-md bg-card p-3 shadow-card">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.label}</span>
                    {a.is_default && <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">DEFAULT</span>}
                  </div>
                  <p className="font-medium">{a.full_name} · {a.phone}</p>
                  <p className="text-muted-foreground">{a.address}, {a.thana}, {a.district}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {!a.is_default && (
                    <button onClick={() => setDefault(a.id)} className="rounded p-1 text-muted-foreground hover:text-primary" aria-label="Set default">
                      <Star className="size-4" />
                    </button>
                  )}
                  <button onClick={() => setEditing(a)} className="rounded p-1 text-xs text-primary">Edit</button>
                  <button onClick={() => del(a.id)} className="rounded p-1 text-destructive" aria-label="Delete"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setEditing(null)}>
            <div className="w-full max-w-md rounded-t-xl bg-card p-4 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-3 text-lg font-bold">{editing.id ? "Edit Address" : "Add Address"}</h2>
              <div className="space-y-2">
                <input value={editing.label ?? "Home"} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Label (Home, Office)" className="w-full rounded border px-3 py-2 text-sm" />
                <input value={editing.full_name ?? ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} placeholder="Full name" className="w-full rounded border px-3 py-2 text-sm" />
                <input value={editing.phone ?? ""} maxLength={11} onChange={(e) => setEditing({ ...editing, phone: e.target.value.replace(/\D/g, "") })} placeholder="01XXXXXXXXX" className="w-full rounded border px-3 py-2 text-sm" />
                <select value={editing.district ?? ""} onChange={(e) => setEditing({ ...editing, district: e.target.value, thana: "" })} className="w-full rounded border bg-background px-3 py-2 text-sm">
                  <option value="">Select district</option>
                  {BD_DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                </select>
                <select value={editing.thana ?? ""} onChange={(e) => setEditing({ ...editing, thana: e.target.value })} disabled={!editing.district} className="w-full rounded border bg-background px-3 py-2 text-sm disabled:opacity-50">
                  <option value="">Select thana</option>
                  {(BD_LOCATIONS[editing.district ?? ""] ?? []).map((t) => <option key={t}>{t}</option>)}
                </select>
                <textarea rows={2} value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} placeholder="House / Road / Block" className="w-full rounded border px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editing.is_default} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} />
                  Set as default
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditing(null)} className="flex-1 rounded border py-2 text-sm">Cancel</button>
                <button onClick={save} className="flex-1 rounded bg-primary py-2 text-sm font-semibold text-primary-foreground">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

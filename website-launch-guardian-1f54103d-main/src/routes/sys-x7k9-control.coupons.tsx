import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Tag, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Surface, PrimaryButton, GhostButton, DangerButton, TextInput, SelectInput, Badge, Modal } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/coupons")({
  component: CouponsAdmin,
});

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  product_ids: string[] | null;
};

type ProdLite = { id: string; name: string; price: number };

const empty: Partial<Coupon> = { code: "", discount_type: "percent", discount_value: 10, min_order: 0, is_active: true, product_ids: null };

function CouponsAdmin() {
  const [list, setList] = useState<Coupon[]>([]);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);

  const load = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.code) return toast.error("Code required");
    const payload = {
      code: editing.code.toUpperCase().trim(),
      discount_type: editing.discount_type ?? "percent",
      discount_value: Number(editing.discount_value ?? 0),
      min_order: Number(editing.min_order ?? 0),
      max_discount: editing.max_discount ? Number(editing.max_discount) : null,
      expires_at: editing.expires_at || null,
      usage_limit: editing.usage_limit ? Number(editing.usage_limit) : null,
      is_active: editing.is_active ?? true,
      product_ids: editing.product_ids && editing.product_ids.length > 0 ? editing.product_ids : null,
    };
    const { error } = editing.id
      ? await supabase.from("coupons").update(payload).eq("id", editing.id)
      : await supabase.from("coupons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Tag}
        title="Coupons"
        subtitle={`${list.length} coupons — ${list.filter((c) => c.is_active).length} active`}
        actions={<PrimaryButton onClick={() => setEditing(empty)}><Plus className="h-3.5 w-3.5" /> New coupon</PrimaryButton>}
      />

      <Surface className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-purple-50/50 text-[10px] uppercase tracking-widest text-purple-800/70">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Code</th>
                <th className="px-3 py-3 text-left font-bold">Discount</th>
                <th className="px-3 py-3 text-left font-bold">Min order</th>
                <th className="px-3 py-3 text-left font-bold">Used</th>
                <th className="px-3 py-3 text-left font-bold">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-purple-50/30">
                  <td className="px-4 py-2.5 font-mono font-black text-purple-900">{c.code}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{c.discount_type === "percent" ? `${c.discount_value}%` : `৳${c.discount_value}`}</td>
                  <td className="px-3 py-2.5 text-slate-600">৳{c.min_order}</td>
                  <td className="px-3 py-2.5 text-slate-600">{c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={c.is_active ? "sky" : "slate"}>{c.is_active ? "Active" : "Off"}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <GhostButton onClick={() => setEditing(c)}><Pencil className="h-3 w-3" /> Edit</GhostButton>
                      <DangerButton onClick={() => del(c.id)}><Trash2 className="h-3 w-3" /></DangerButton>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400">No coupons yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Surface>

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h2 className="mb-4 text-lg font-black text-purple-950">{editing.id ? "Edit coupon" : "New coupon"}</h2>
          <div className="space-y-2.5">
            <TextInput value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="CODE" className="font-mono uppercase" />
            <div className="grid grid-cols-2 gap-2">
              <SelectInput value={editing.discount_type ?? "percent"} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value })}>
                <option value="percent">% Percent</option>
                <option value="fixed">৳ Fixed</option>
              </SelectInput>
              <TextInput type="number" value={editing.discount_value ?? ""} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} placeholder="Value" />
            </div>
            <TextInput type="number" value={editing.min_order ?? ""} onChange={(e) => setEditing({ ...editing, min_order: Number(e.target.value) })} placeholder="Minimum order (৳)" />
            <TextInput type="number" value={editing.max_discount ?? ""} onChange={(e) => setEditing({ ...editing, max_discount: e.target.value ? Number(e.target.value) : null })} placeholder="Max discount cap (৳, optional)" />
            <TextInput type="number" value={editing.usage_limit ?? ""} onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="Usage limit (optional)" />
            <TextInput type="datetime-local" value={editing.expires_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Active
            </label>
            <ProductPicker
              selected={editing.product_ids ?? []}
              onChange={(ids) => setEditing({ ...editing, product_ids: ids })}
            />
          </div>
          <div className="mt-5 flex gap-2">
            <GhostButton onClick={() => setEditing(null)} className="flex-1 py-2.5">Cancel</GhostButton>
            <PrimaryButton onClick={save} className="flex-1 py-2.5">Save</PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProdLite[]>([]);
  const [chosen, setChosen] = useState<ProdLite[]>([]);
  const [loading, setLoading] = useState(false);

  // Hydrate chosen product info from ids
  useEffect(() => {
    if (selected.length === 0) { setChosen([]); return; }
    const missing = selected.filter((id) => !chosen.find((c) => c.id === id));
    if (missing.length === 0) return;
    supabase.from("products").select("id,name,price").in("id", missing).then(({ data }) => {
      if (data) setChosen((prev) => [...prev, ...(data as ProdLite[])].filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join(",")]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setRows([]); return; }
      setLoading(true);
      const { data } = await supabase.from("products")
        .select("id,name,price").eq("is_active", true)
        .ilike("name", `%${q.trim()}%`).limit(8);
      setRows((data ?? []) as ProdLite[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const add = (p: ProdLite) => {
    if (selected.includes(p.id)) return;
    onChange([...selected, p.id]);
    setChosen((prev) => (prev.find((x) => x.id === p.id) ? prev : [...prev, p]));
    setQ("");
    setRows([]);
  };
  const remove = (id: string) => onChange(selected.filter((x) => x !== id));

  return (
    <div className="rounded-md border border-slate-200 p-2.5">
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-bold text-purple-900">Apply only on these products</label>
        {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="text-[10px] text-red-600 hover:underline">Clear</button>}
      </div>
      <p className="mb-2 text-[10px] text-slate-500">Leave empty to apply on all products.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product by name…" className="w-full rounded border px-2 py-1.5 text-xs" />
      {loading && <p className="mt-1 text-[10px] text-slate-500">Searching…</p>}
      {rows.length > 0 && (
        <ul className="mt-1 max-h-40 overflow-y-auto rounded border divide-y">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => add(r)} className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs hover:bg-purple-50">
                <span className="truncate">{r.name}</span>
                <span className="ml-2 font-bold">৳{r.price}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selected.map((id) => {
            const p = chosen.find((c) => c.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] text-purple-900">
                {p?.name ?? id.slice(0, 8)}
                <button type="button" onClick={() => remove(id)} className="text-purple-700 hover:text-red-600">×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

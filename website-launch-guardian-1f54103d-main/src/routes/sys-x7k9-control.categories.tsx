import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, FolderTree, ChevronDown, ChevronRight } from "lucide-react";
import { slugify, type DBCategory } from "@/lib/admin-api";
import { PageHeader, Surface, PrimaryButton, TextInput, SelectInput, DangerButton } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/categories")({
  component: CategoriesAdmin,
});

function CategoriesAdmin() {
  const [items, setItems] = useState<DBCategory[]>([]);
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [subParent, setSubParent] = useState("");
  const [icon, setIcon] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");
    setItems((data as DBCategory[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim()) return;
    const parentId = subParent || parent || null;
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      slug: slugify(name),
      icon: icon || null,
      parent_id: parentId,
    });
    if (error) return toast.error(error.message);
    setName(""); setIcon(""); setSubParent("");
    toast.success("Added");
    load();
  }

  async function del(id: string) {
    const descendants = collectDescendants(items, id);
    const msg = descendants.length
      ? `Delete this and ${descendants.length} nested item(s)?`
      : "Delete?";
    if (!confirm(msg)) return;
    const ids = [id, ...descendants];
    const { error } = await supabase.from("categories").delete().in("id", ids);
    if (error) return toast.error(error.message);
    load();
  }

  const roots = useMemo(() => items.filter((c) => !c.parent_id), [items]);
  const childrenOf = (id: string) => items.filter((c) => c.parent_id === id);
  const subsOfSelectedParent = parent ? childrenOf(parent) : [];

  return (
    <div className="space-y-5">
      <PageHeader icon={FolderTree} title="Categories" subtitle={`${items.length} items · supports 3 levels (Category → Subcategory → Option)`} />

      <Surface>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-700/70">Add category / subcategory / option</h2>
        <div className="grid gap-2 sm:grid-cols-5">
          <SelectInput value={parent} onChange={(e) => { setParent(e.target.value); setSubParent(""); }}>
            <option value="">— Top-level category —</option>
            {roots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </SelectInput>
          <SelectInput value={subParent} onChange={(e) => setSubParent(e.target.value)} disabled={!parent}>
            <option value="">{parent ? "— Add as subcategory —" : "Pick parent first"}</option>
            {subsOfSelectedParent.map((s) => (
              <option key={s.id} value={s.id}>↳ {s.name} (add option under this)</option>
            ))}
          </SelectInput>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <TextInput value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Emoji or icon URL (optional)" />
          <PrimaryButton onClick={add}>
            <Plus className="h-4 w-4" /> Add
          </PrimaryButton>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Leave both dropdowns empty to create a top-level category. Pick a category to add a subcategory. Pick a subcategory to add an option under it.
        </p>
      </Surface>

      <Surface>
        {roots.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No categories yet</p>
        ) : (
          <ul className="space-y-3">
            {roots.map((r) => {
              const subs = childrenOf(r.id);
              const isOpen = expanded[r.id] ?? true;
              return (
                <li key={r.id}>
                  <div className="flex items-center justify-between rounded-xl bg-purple-50/60 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setExpanded({ ...expanded, [r.id]: !isOpen })}
                      className="flex items-center gap-2 text-left"
                    >
                      {subs.length > 0 ? (
                        isOpen ? <ChevronDown className="h-4 w-4 text-purple-700" /> : <ChevronRight className="h-4 w-4 text-purple-700" />
                      ) : <span className="w-4" />}
                      {r.icon && (
                        <span className="text-lg">
                          {r.icon.startsWith("http") ? <img src={r.icon} className="h-5 w-5" /> : r.icon}
                        </span>
                      )}
                      <span className="font-bold text-purple-950">{r.name}</span>
                      <span className="font-mono text-xs text-slate-400">/{r.slug}</span>
                      <span className="ml-1 rounded-full bg-white px-1.5 text-[10px] font-semibold text-purple-700">{subs.length}</span>
                    </button>
                    <DangerButton onClick={() => del(r.id)}><Trash2 className="h-3.5 w-3.5" /></DangerButton>
                  </div>

                  {isOpen && subs.length > 0 && (
                    <ul className="ml-4 mt-1 space-y-1 border-l-2 border-purple-100 pl-3">
                      {subs.map((s) => {
                        const opts = childrenOf(s.id);
                        const subOpen = expanded[s.id] ?? true;
                        return (
                          <li key={s.id}>
                            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-sm">
                              <button
                                type="button"
                                onClick={() => setExpanded({ ...expanded, [s.id]: !subOpen })}
                                className="flex items-center gap-1.5 text-left"
                              >
                                {opts.length > 0 ? (
                                  subOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                                ) : <span className="w-3.5" />}
                                <span className="text-slate-700">↳ {s.name}</span>
                                <span className="font-mono text-xs text-slate-400">/{s.slug}</span>
                                {opts.length > 0 && (
                                  <span className="rounded-full bg-purple-50 px-1.5 text-[10px] font-semibold text-purple-700">{opts.length}</span>
                                )}
                              </button>
                              <DangerButton onClick={() => del(s.id)}><Trash2 className="h-3 w-3" /></DangerButton>
                            </div>

                            {subOpen && opts.length > 0 && (
                              <ul className="ml-4 mt-1 flex flex-wrap gap-1.5 border-l border-slate-100 pl-3">
                                {opts.map((o) => (
                                  <li key={o.id} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1 text-xs">
                                    <span className="text-slate-700">• {o.name}</span>
                                    <span className="font-mono text-[10px] text-slate-400">/{o.slug}</span>
                                    <button
                                      onClick={() => del(o.id)}
                                      className="ml-1 rounded-full p-0.5 text-red-500 hover:bg-red-50"
                                      aria-label="Delete option"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Surface>
    </div>
  );
}

function collectDescendants(all: DBCategory[], parentId: string): string[] {
  const out: string[] = [];
  const stack = [parentId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of all) {
      if (c.parent_id === cur) {
        out.push(c.id);
        stack.push(c.id);
      }
    }
  }
  return out;
}

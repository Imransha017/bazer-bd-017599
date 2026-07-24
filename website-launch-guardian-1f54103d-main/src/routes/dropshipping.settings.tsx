import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyDropshipper, updateMyDropshipper, type Dropshipper } from "@/lib/dropshipper";
import { toast } from "sonner";

export const Route = createFileRoute("/dropshipping/settings")({
  head: () => ({ meta: [{ title: "Settings — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [ds, setDs] = useState<Dropshipper | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [method, setMethod] = useState("bkash");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyDropshipper().then(d => {
      if (!d) return;
      setDs(d); setName(d.store_name); setBio(d.bio ?? ""); setPhone(d.phone);
      setWhatsapp(d.whatsapp ?? ""); setMethod(d.payout_method); setAccount(d.payout_number);
    });
  }, []);

  if (!ds) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const save = async () => {
    setBusy(true);
    try {
      await updateMyDropshipper({ store_name: name, bio, phone, whatsapp, payout_method: method, payout_number: account });
      toast.success("Saved");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-xl rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-bold">Store settings</h3>
      <div className="grid gap-3">
        <Field label="Store name"><input value={name} onChange={e => setName(e.target.value)} className="input" /></Field>
        <Field label="Bio"><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="input" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} className="input" /></Field>
          <Field label="WhatsApp"><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="input" /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Payout method">
            <select value={method} onChange={e => setMethod(e.target.value)} className="input">
              <option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option><option value="bank">Bank</option>
            </select>
          </Field>
          <Field label="Account / number"><input value={account} onChange={e => setAccount(e.target.value)} className="input" /></Field>
        </div>
        <button onClick={save} disabled={busy} className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.input{width:100%;border:1px solid hsl(var(--border));border-radius:0.375rem;padding:0.5rem 0.75rem;font-size:0.875rem;background:hsl(var(--background))}` }} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold">{label}</span><div className="mt-1">{children}</div></label>;
}

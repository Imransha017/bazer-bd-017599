import type { VendorFooter as TVendorFooter } from "@/lib/vendor";
import { Facebook, Instagram, Youtube, MessageCircle, Music2, Phone, Mail, MapPin, Store } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";

export function VendorFooter({ footer, storeName, fallbackLogo, fallbackPhone, fallbackAddress, fallbackAbout }: { footer: TVendorFooter | null; storeName: string; fallbackLogo: string | null; fallbackPhone?: string | null; fallbackAddress?: string | null; fallbackAbout?: string | null }) {
  const f = footer ?? {};
  const logo = fallbackLogo ?? f.logo_url;
  const bg = f.bg_color || undefined;
  const color = f.text_color || undefined;
  const about = f.about || fallbackAbout || "";
  const phone = f.phone || fallbackPhone || "";
  const address = f.address || fallbackAddress || "";
  const email = f.email || "";
  const links = Array.isArray(f.links) ? f.links.filter(l => l.label && l.url) : [];
  const social = f.social ?? {};
  const socials: [keyof NonNullable<TVendorFooter["social"]>, string | undefined, typeof Facebook][] = [
    ["facebook", social.facebook, Facebook],
    ["instagram", social.instagram, Instagram],
    ["youtube", social.youtube, Youtube],
    ["tiktok", social.tiktok, Music2],
    ["whatsapp", social.whatsapp, MessageCircle],
  ];
  const anyContact = phone || email || address;
  const anyLinks = links.length > 0;
  const anySocial = socials.some(([, v]) => v);

  return (
    <footer className="mt-8 border-t" style={{ background: bg, color }}>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-4">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border bg-muted">
              {logo ? <ProductImage src={logo} alt={storeName} className="size-full object-cover" /> : <Store className="size-5 text-muted-foreground" />}
            </div>
            <h3 className="text-lg font-bold">{storeName}</h3>
          </div>
          {about && <p className="max-w-md whitespace-pre-wrap text-sm opacity-80">{about}</p>}
        </div>

        {anyContact && (
          <div>
            <h4 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-90">Contact</h4>
            <ul className="space-y-1.5 text-sm opacity-90">
              {phone && <li className="flex items-center gap-2"><Phone className="size-3.5" /> <a href={`tel:${phone}`}>{phone}</a></li>}
              {email && <li className="flex items-center gap-2"><Mail className="size-3.5" /> <a href={`mailto:${email}`}>{email}</a></li>}
              {address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5" /> <span>{address}</span></li>}
            </ul>
          </div>
        )}

        {anyLinks && (
          <div>
            <h4 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-90">Links</h4>
            <ul className="space-y-1.5 text-sm opacity-90">
              {links.map((l, i) => (
                <li key={i}><a href={l.url} target="_blank" rel="noreferrer" className="hover:underline">{l.label}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(anySocial || f.copyright) && (
        <div className="border-t/50 border-t">
          <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-3 px-4 py-4 text-xs opacity-80 md:flex-row">
            <p>{f.copyright || `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`}</p>
            {anySocial && (
              <div className="flex items-center gap-2">
                {socials.map(([k, url, Icon]) => url ? (
                  <a key={k} href={url} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-full border hover:bg-white/10">
                    <Icon className="size-4" />
                  </a>
                ) : null)}
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}

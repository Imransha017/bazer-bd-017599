import { useI18n } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/site-settings";
import { Facebook, Instagram, Youtube, Twitter, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  useI18n();
  const s = useSiteSettings();
  const columns = s.footer.columns.length ? s.footer.columns : [
    { title: "Customer Care", links: [{ label: "Help Center", href: "#" }, { label: "How to Buy", href: "#" }, { label: "Returns & Refunds", href: "#" }, { label: "Contact Us", href: "#" }] },
    { title: "Bazar", links: [{ label: "About", href: "#" }, { label: "Careers", href: "#" }, { label: "Blog", href: "#" }, { label: "Press", href: "#" }] },
  ];

  const socials: [string, any][] = [
    [s.footer.social.facebook, Facebook],
    [s.footer.social.instagram, Instagram],
    [s.footer.social.youtube, Youtube],
    [s.footer.social.twitter, Twitter],
  ];

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-none px-4 pb-6 pt-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-4">
          {columns.slice(0, 4).map((col, i) => (
            <div key={i}>
              <h4 className="mb-2 font-bold">{col.title}</h4>
              <ul className="space-y-1 text-muted-foreground">
                {col.links.map((l, j) => (
                  <li key={j}><a href={l.href} className="hover:text-foreground">{l.label}</a></li>
                ))}
              </ul>
            </div>
          ))}

          {columns.length < 3 && (
            <div>
              <h4 className="mb-2 font-bold">Payment</h4>
              <div className="flex flex-wrap gap-1.5">
                {s.footer.payment_badges.map(({ label, bg, fg }) => (
                  <span key={label} style={{ background: bg, color: fg }}
                    className="inline-flex h-7 min-w-[44px] items-center justify-center rounded border border-border px-2 text-[10px] font-extrabold italic tracking-tight shadow-sm">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {columns.length < 4 && (s.footer.contact.email || s.footer.contact.phone || s.footer.contact.address) && (
            <div>
              <h4 className="mb-2 font-bold">Contact</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                {s.footer.contact.email && <li className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{s.footer.contact.email}</li>}
                {s.footer.contact.phone && <li className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{s.footer.contact.phone}</li>}
                {s.footer.contact.address && <li className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{s.footer.contact.address}</li>}
              </ul>
            </div>
          )}
        </div>

        {columns.length >= 3 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {s.footer.payment_badges.map(({ label, bg, fg }) => (
              <span key={label} style={{ background: bg, color: fg }}
                className="inline-flex h-7 min-w-[44px] items-center justify-center rounded border border-border px-2 text-[10px] font-extrabold italic tracking-tight shadow-sm">
                {label}
              </span>
            ))}
          </div>
        )}

        {socials.some(([u]) => !!u) && (
          <div className="mt-4 flex gap-2">
            {socials.map(([url, Icon], i) => url ? (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground">
                <Icon className="h-4 w-4" />
              </a>
            ) : null)}
          </div>
        )}

        <p className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
          {s.footer.copyright_text.replace("{year}", "2026")}
        </p>
      </div>
    </footer>
  );
}

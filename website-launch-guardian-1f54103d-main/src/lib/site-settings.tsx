import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NavLink = { label: string; href: string; sort?: number };
export type FooterColumn = { title: string; links: { label: string; href: string }[] };
export type PaymentBadge = { label: string; bg: string; fg: string };

export type SiteSettings = {
  brand: { name: string; tagline: string; logo_url: string; favicon_url: string };
  header: {
    top_bar_enabled: boolean;
    top_bar_text: string;
    nav_links: NavLink[];
    show_search: boolean;
    show_wishlist: boolean;
    show_cart: boolean;
    show_account: boolean;
  };
  footer: {
    columns: FooterColumn[];
    payment_badges: PaymentBadge[];
    app_links: { app_store: string; google_play: string };
    contact: { email: string; phone: string; address: string };
    social: { facebook: string; instagram: string; youtube: string; twitter: string };
    copyright_text: string;
  };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand: { name: "Bazar BD", tagline: "Bangladesh's premium online marketplace", logo_url: "", favicon_url: "" },
  header: {
    top_bar_enabled: true,
    top_bar_text: "",
    nav_links: [],
    show_search: true, show_wishlist: true, show_cart: true, show_account: true,
  },
  footer: {
    columns: [],
    payment_badges: [
      { label: "bKash", bg: "#E2136E", fg: "#ffffff" },
      { label: "Nagad", bg: "#EC1C24", fg: "#ffffff" },
      { label: "Rocket", bg: "#8B2C8B", fg: "#ffffff" },
      { label: "VISA", bg: "#1A1F71", fg: "#F7B600" },
      { label: "MasterCard", bg: "#ffffff", fg: "#EB001B" },
      { label: "COD", bg: "#16a34a", fg: "#ffffff" },
    ],
    app_links: { app_store: "", google_play: "" },
    contact: { email: "", phone: "", address: "" },
    social: { facebook: "", instagram: "", youtube: "", twitter: "" },
    copyright_text: "© 2026 Bazar Clone",
  },
};

function merge(partial: Partial<SiteSettings> | null | undefined): SiteSettings {
  const p = partial ?? {};
  return {
    brand: { ...DEFAULT_SETTINGS.brand, ...(p.brand ?? {}) },
    header: { ...DEFAULT_SETTINGS.header, ...(p.header ?? {}) },
    footer: { ...DEFAULT_SETTINGS.footer, ...(p.footer ?? {}) },
  };
}

export const siteSettingsQuery = () =>
  queryOptions({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_settings_public")
        .select("settings")
        .eq("id", 1)
        .maybeSingle();
      if (error) return DEFAULT_SETTINGS;
      return merge(data?.settings as Partial<SiteSettings> | undefined);
    },
    staleTime: 60_000,
  });

export function useSiteSettings(): SiteSettings {
  const { data } = useQuery(siteSettingsQuery());
  return data ?? DEFAULT_SETTINGS;
}

export async function saveSiteSettings(settings: SiteSettings) {
  const { error } = await (supabase as any)
    .from("site_settings")
    .update({ settings })
    .eq("id", 1);
  if (error) throw error;
}

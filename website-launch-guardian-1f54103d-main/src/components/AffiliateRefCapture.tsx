import { useEffect } from "react";
import { getSettings, setRefCode, trackClick } from "@/lib/affiliate";

export function AffiliateRefCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    const code = ref.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
    if (!code) return;
    const productId = params.get("p");
    const expParam = Number(params.get("exp") || 0);
    (async () => {
      try {
        const s = await getSettings();
        if (!s.is_enabled) return;
        // Respect link expiry embedded in URL — link is invalid after that time.
        if (expParam && expParam < Date.now()) return;
        // Days remaining based on link expiry, capped at global cookie window.
        const daysFromExp = expParam ? Math.max(1, Math.ceil((expParam - Date.now()) / 86400_000)) : s.cookie_days;
        const days = Math.min(daysFromExp, s.cookie_days || 30);
        setRefCode(code, days, productId);
        trackClick(code, productId);
      } catch {}
    })();
  }, []);
  return null;
}

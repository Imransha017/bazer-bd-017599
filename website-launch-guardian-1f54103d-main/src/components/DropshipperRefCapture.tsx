import { useEffect } from "react";
import { setDsCode, trackDsClick } from "@/lib/dropshipper";

export function DropshipperRefCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ds = params.get("ds");
    if (!ds) return;
    const code = ds.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
    if (!code) return;
    setDsCode(code, 30);
    void trackDsClick(code, params.get("p"));
  }, []);
  return null;
}

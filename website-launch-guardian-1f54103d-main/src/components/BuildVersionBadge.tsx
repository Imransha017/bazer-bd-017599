declare const __BUILD_ID__: string;

export function BuildVersionBadge() {
  const id = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
  // Compact: 2026-07-03T10:22 → 0703-1022
  const short = id.replace(/[-:TZ.]/g, "").slice(2, 12);
  return (
    <div
      title={`Build ${id}`}
      className="fixed bottom-1 right-1 z-[9999] rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-white/80 pointer-events-none select-none"
    >
      v{short}
    </div>
  );
}

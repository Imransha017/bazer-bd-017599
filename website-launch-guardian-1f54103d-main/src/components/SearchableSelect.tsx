import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";

interface Props {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledText?: string;
  className?: string;
  id?: string;
}

/**
 * Accessible searchable combobox that renders ALL matching options in a
 * scrollable list — no virtualization, no truncation. Fixes native <select>
 * dropdown quirks where long option lists (e.g. Dhaka DMP thanas) appeared
 * clipped on some browsers / OS combinations.
 */
export function SearchableSelect({
  value, options, onChange, placeholder = "Select…",
  disabled, disabledText, className = "", id,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = rootRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const gap = 6;
      const edgePadding = 12;
      const spaceBelow = window.innerHeight - trigger.bottom - edgePadding;
      const spaceAbove = trigger.top - edgePadding;
      const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
      const availableHeight = Math.max(220, (openUp ? spaceAbove : spaceBelow) - gap);

      setPanelStyle({
        position: "fixed",
        left: Math.max(edgePadding, trigger.left),
        top: openUp ? undefined : trigger.bottom + gap,
        bottom: openUp ? window.innerHeight - trigger.top + gap : undefined,
        width: Math.max(220, trigger.width),
        maxHeight: Math.min(520, availableHeight),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [q, options]);

  const label = disabled ? (disabledText ?? placeholder) : (value || placeholder);

  const dropdown = open && !disabled && mounted ? createPortal(
    <div
      ref={panelRef}
      className="z-[9999] flex min-h-0 flex-col rounded-md border bg-popover shadow-lg"
      style={panelStyle}
    >
      <div className="flex shrink-0 items-center gap-2 border-b px-2 py-1.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="flex-1 bg-transparent py-1 text-sm outline-none"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="rounded p-0.5 hover:bg-muted">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {/* Native scroll — ALL matching options render, no virtualization */}
      <ul
        role="listbox"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
        ) : (
          filtered.map((opt) => {
            const active = opt === value;
            return (
              <li key={opt}>
                <button
                  role="option"
                  aria-selected={active}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); setQ(""); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${active ? "bg-muted font-medium" : ""}`}
                >
                  {opt}
                </button>
              </li>
            );
          })
        )}
      </ul>
      <div className="shrink-0 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        Showing {filtered.length} of {options.length}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm disabled:opacity-60"
      >
        <span className={value ? "" : "text-muted-foreground"}>{label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {dropdown}
    </div>
  );
}

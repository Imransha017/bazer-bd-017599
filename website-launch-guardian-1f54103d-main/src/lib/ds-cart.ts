// Dropshipper cart — localStorage-based bulk order cart
export type DsCartItem = {
  line_id: string; // unique per import_id + variant selection
  import_id: string;
  product_id: string;
  name: string;
  image?: string;
  base_price: number;
  retail_price: number;
  sell_price: number;
  qty: number;
  size?: string;
  color?: string;
  variant?: string;
  sku?: string;
  stock?: number;
};

const KEY = "ds_cart_v1";
type Listener = (items: DsCartItem[]) => void;
const listeners = new Set<Listener>();

const buildLineId = (i: Pick<DsCartItem, "import_id" | "size" | "color" | "variant">) =>
  `${i.import_id}|${i.size || ""}|${i.color || ""}|${i.variant || ""}`;

export function getDsCart(): DsCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as DsCartItem[];
    // Back-fill line_id for entries saved by older versions
    return raw.map(i => ({ ...i, line_id: i.line_id || buildLineId(i) }));
  } catch { return []; }
}

function save(items: DsCartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach(l => l(items));
}

export function subscribeDsCart(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function addToDsCart(item: Omit<DsCartItem, "qty" | "line_id"> & { qty?: number }) {
  const items = getDsCart();
  const line_id = buildLineId(item);
  const idx = items.findIndex(i => i.line_id === line_id);
  if (idx >= 0) items[idx].qty += item.qty ?? 1;
  else items.push({ ...item, line_id, qty: item.qty ?? 1 });
  save(items);
}

export function updateDsCartItem(line_id: string, patch: Partial<DsCartItem>) {
  const items = getDsCart().map(i => i.line_id === line_id ? { ...i, ...patch } : i);
  save(items);
}

export function removeDsCartItem(line_id: string) {
  save(getDsCart().filter(i => i.line_id !== line_id));
}

export function clearDsCart() { save([]); }

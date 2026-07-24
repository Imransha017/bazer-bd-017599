// Opens a new window with a print-friendly invoice and triggers the print dialog.
// Users can "Save as PDF" from the browser's print dialog.

type InvoiceItem = {
  name: string;
  price: number;
  qty: number;
  image?: string | null;
  variant?: string | null;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
};

export type InvoiceData = {
  order_number: string;
  created_at: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  address: string;
  thana?: string | null;
  district?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  delivery_fee: number;
  discount?: number | null;
  coupon_code?: string | null;
  total: number;
  payment_method: string;
  payment_type?: string | null;
  txn_id?: string | null;
  sender_phone?: string | null;
  paid_amount?: number | null;
  notes?: string | null;
  courier_name?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  vendor_name?: string | null;
  site_name?: string;
  site_phone?: string;
  site_address?: string;
};

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n: number | null | undefined) => `৳${Number(n ?? 0).toFixed(0)}`;

export function openPrintableInvoice(o: InvoiceData) {
  const itemsHtml = o.items
    .map((it) => {
      const meta = [
        it.variant && `<span class="chip">${esc(it.variant)}</span>`,
        it.size && `<span class="chip">Size: <b>${esc(it.size)}</b></span>`,
        it.color && `<span class="chip">Color: <b>${esc(it.color)}</b></span>`,
        it.sku && `<span class="chip mono">SKU: ${esc(it.sku)}</span>`,
      ]
        .filter(Boolean)
        .join(" ");
      return `<tr>
        <td class="prod">
          <div class="pname">${esc(it.name)}</div>
          ${meta ? `<div class="pmeta">${meta}</div>` : ""}
        </td>
        <td class="num">${money(it.price)}</td>
        <td class="num">${it.qty}</td>
        <td class="num total">${money(Number(it.price) * it.qty)}</td>
      </tr>`;
    })
    .join("");

  const discountRow =
    Number(o.discount ?? 0) > 0
      ? `<tr><td>Discount${o.coupon_code ? ` (${esc(o.coupon_code)})` : ""}</td><td class="num">− ${money(o.discount)}</td></tr>`
      : "";

  const trackingBlock =
    o.courier_name || o.tracking_number
      ? `<div class="box">
          <div class="btitle">Shipping</div>
          <div><b>Courier:</b> ${esc(o.courier_name ?? "—")}</div>
          ${o.tracking_number ? `<div><b>Tracking #:</b> ${esc(o.tracking_number)}</div>` : ""}
          ${o.tracking_url ? `<div class="mono small">${esc(o.tracking_url)}</div>` : ""}
        </div>`
      : "";

  const paymentExtra = [
    o.txn_id && `<div><b>Txn ID:</b> ${esc(o.txn_id)}</div>`,
    o.sender_phone && `<div><b>Sender:</b> ${esc(o.sender_phone)}</div>`,
    Number(o.paid_amount ?? 0) > 0 && `<div><b>Paid:</b> ${money(o.paid_amount)}</div>`,
  ]
    .filter(Boolean)
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(o.order_number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e1b4b; margin: 0; padding: 24px; background: #fff; }
  .wrap { max-width: 780px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7c3aed; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { font-size: 22px; font-weight: 800; color: #6d28d9; }
  .sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  .inv { text-align: right; }
  .inv .title { font-size: 20px; font-weight: 800; letter-spacing: 0.05em; color: #0f172a; }
  .inv .meta { font-size: 12px; color: #475569; margin-top: 4px; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #ede9fe; color: #6d28d9; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 13px; }
  .btitle { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #7c3aed; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th { text-align: left; background: #f5f3ff; color: #4c1d95; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px; border-bottom: 2px solid #ddd6fe; }
  td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; }
  td.total { font-weight: 700; color: #6d28d9; }
  .pname { font-weight: 600; }
  .pmeta { margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
  .chip { background: #f1f5f9; color: #334155; font-size: 10px; padding: 2px 6px; border-radius: 4px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .small { font-size: 11px; }
  .totals { margin-top: 12px; margin-left: auto; width: 300px; font-size: 13px; }
  .totals table { margin: 0; }
  .totals td { border: none; padding: 4px 8px; }
  .totals .grand td { border-top: 2px solid #1e1b4b; font-size: 16px; font-weight: 800; color: #6d28d9; padding-top: 8px; }
  .note { margin-top: 14px; padding: 10px 12px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 12px; white-space: pre-wrap; }
  .foot { margin-top: 30px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
  .actions { text-align: center; margin-bottom: 16px; }
  .actions button { background: #7c3aed; color: white; border: 0; padding: 8px 18px; border-radius: 6px; font-weight: 700; cursor: pointer; margin: 0 4px; font-size: 13px; }
  .actions .ghost { background: #e2e8f0; color: #334155; }
  @media print {
    .actions { display: none; }
    body { padding: 0; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="actions">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button class="ghost" onclick="window.close()">Close</button>
  </div>
  <div class="head">
    <div>
      <div class="brand">${esc(o.site_name || "Invoice")}</div>
      ${o.site_phone ? `<div class="sub">📞 ${esc(o.site_phone)}</div>` : ""}
      ${o.site_address ? `<div class="sub">📍 ${esc(o.site_address)}</div>` : ""}
    </div>
    <div class="inv">
      <div class="title">INVOICE</div>
      <div class="meta">#${esc(o.order_number)}</div>
      <div class="meta">${esc(new Date(o.created_at).toLocaleString())}</div>
      <div class="meta"><span class="status">${esc(o.status)}</span></div>
    </div>
  </div>

  <div class="grid2">
    <div class="box">
      <div class="btitle">Bill To</div>
      <div><b>${esc(o.customer_name)}</b></div>
      <div>📞 ${esc(o.customer_phone)}</div>
      ${o.customer_email ? `<div class="small">${esc(o.customer_email)}</div>` : ""}
      <div style="margin-top:4px">${esc(o.address)}${o.thana ? ", " + esc(o.thana) : ""}${o.district ? ", " + esc(o.district) : ""}</div>
    </div>
    <div class="box">
      <div class="btitle">Payment</div>
      <div><b>Method:</b> ${esc(o.payment_method.toUpperCase())}${o.payment_type ? " — " + esc(o.payment_type) : ""}</div>
      ${paymentExtra}
      ${o.vendor_name ? `<div style="margin-top:6px"><b>Vendor:</b> ${esc(o.vendor_name)}</div>` : ""}
    </div>
  </div>

  ${trackingBlock}

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:right">Price</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td class="num">${money(o.subtotal)}</td></tr>
      ${discountRow}
      <tr><td>Delivery</td><td class="num">${money(o.delivery_fee)}</td></tr>
      <tr class="grand"><td>Total</td><td class="num">${money(o.total)}</td></tr>
    </table>
  </div>

  ${o.notes ? `<div class="note"><b>Note:</b> ${esc(o.notes)}</div>` : ""}

  <div class="foot">
    Thank you for your order! This is a computer-generated invoice.
  </div>
</div>
<script>
  window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 300); });
</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Please allow pop-ups to download the invoice.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

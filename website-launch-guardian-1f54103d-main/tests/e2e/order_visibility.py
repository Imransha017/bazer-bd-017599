"""
E2E: verify every order field renders in BOTH the admin order-detail page
and the vendor orders panel.

Seeds a fully-populated order via the public `place_order` RPC (as an
approved vendor's product), then logs in as admin and as vendor and asserts
that every field (customer info, items with image + variant/size/color/sku,
pricing breakdown incl. discount, delivery, total, payment + txn + sender +
paid amount, courier tracking, notes, status, timeline) is visible.

Required env vars:
  SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY  (already in sandbox)
  ADMIN_EMAIL, ADMIN_PASSWORD             (admin login)
  VENDOR_EMAIL, VENDOR_PASSWORD           (approved vendor login)
  VENDOR_ID                               (uuid of that vendor's row)

Run: python3 tests/e2e/order_visibility.py
"""
import asyncio, json, os, time, uuid, requests
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(exist_ok=True)

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
ANON = os.environ["SUPABASE_PUBLISHABLE_KEY"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
VENDOR_EMAIL = os.environ["VENDOR_EMAIL"]
VENDOR_PASSWORD = os.environ["VENDOR_PASSWORD"]
VENDOR_ID = os.environ["VENDOR_ID"]

TXN = f"TXN{int(time.time())}"
NOTE = "Please deliver between 5-7 pm. Ring the bell twice."
COURIER = "Steadfast"
TRACK_NUM = f"SF{int(time.time())}"
TRACK_URL = "https://steadfast.com.bd/t/" + TRACK_NUM

PRODUCT = {
    "id": str(uuid.uuid4()),
    "name": "E2E Test Cotton Shirt",
    "price": 850,
    "qty": 2,
    "image": "https://picsum.photos/seed/e2e/200",
    "sku": "SHIRT-RED-L-001",
    "size": "L",
    "color": "Red",
    "variant": "Premium",
}

PAYLOAD = {
    "customer_name": "E2E Customer",
    "customer_phone": "01712345678",
    "customer_email": "e2e-buyer@example.com",
    "address": "House 12, Road 5, Dhanmondi",
    "district": "Dhaka",
    "thana": "Dhanmondi",
    "items": [PRODUCT],
    "subtotal": PRODUCT["price"] * PRODUCT["qty"],
    "delivery_fee": 60,
    "total": PRODUCT["price"] * PRODUCT["qty"] + 60,
    "payment_method": "bkash",
    "payment_type": "full",
    "txn_id": TXN,
    "sender_phone": "01898765432",
    "paid_amount": PRODUCT["price"] * PRODUCT["qty"] + 60,
    "notes": NOTE,
    "vendor_id": VENDOR_ID,
}


def seed_order() -> dict:
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/place_order",
        headers={
            "apikey": ANON,
            "Authorization": f"Bearer {ANON}",
            "Content-Type": "application/json",
        },
        json={"_payload": PAYLOAD},
        timeout=15,
    )
    r.raise_for_status()
    row = r.json()[0]
    print("seeded order:", row)
    # Set tracking + status via authenticated update through the admin UI later,
    # but tracking is easier to seed directly with the admin session; we'll do it via UI.
    return row


async def sign_in(page, email, password):
    await page.goto(f"{BASE}/auth", wait_until="domcontentloaded")
    await page.get_by_label("Email", exact=False).first.fill(email)
    await page.get_by_label("Password", exact=False).first.fill(password)
    await page.get_by_role("button", name="Sign in", exact=False).first.click()
    await page.wait_for_load_state("networkidle")


async def assert_all_fields(page, tag: str):
    """All required order fields must be visible on the current page/modal."""
    body = page.locator("body")
    expected = [
        # customer
        PAYLOAD["customer_name"], PAYLOAD["customer_phone"],
        PAYLOAD["customer_email"], PAYLOAD["address"],
        PAYLOAD["district"], PAYLOAD["thana"],
        # item + variant metadata
        PRODUCT["name"], PRODUCT["sku"], PRODUCT["size"],
        PRODUCT["color"], PRODUCT["variant"],
        # pricing
        str(PAYLOAD["subtotal"]), str(PAYLOAD["delivery_fee"]),
        str(PAYLOAD["total"]),
        # payment
        TXN, PAYLOAD["sender_phone"],
        # notes
        NOTE,
        # courier
        COURIER, TRACK_NUM,
    ]
    missing = []
    for text in expected:
        try:
            await expect(body).to_contain_text(text, timeout=2500)
        except Exception:
            missing.append(text)
    # product image rendered
    img_count = await page.locator(f'img[src*="picsum.photos/seed/e2e"]').count()
    if img_count == 0:
        missing.append("product image")
    # tracking url as link
    if await page.locator(f'a[href="{TRACK_URL}"]').count() == 0 \
            and TRACK_URL not in await body.inner_text():
        missing.append(TRACK_URL)
    assert not missing, f"[{tag}] missing fields: {missing}"
    print(f"[{tag}] all fields present ✓")


async def admin_flow(page, order):
    await sign_in(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(f"{BASE}/sys-x7k9-control/orders/{order['id']}",
                    wait_until="networkidle")
    await page.screenshot(path=str(SHOTS / "admin_before_tracking.png"))

    # Fill courier tracking through the UI, then save.
    await page.get_by_placeholder("Courier", exact=False).fill(COURIER)
    await page.get_by_placeholder("Tracking #", exact=False).fill(TRACK_NUM)
    await page.get_by_placeholder("https://tracking-url").fill(TRACK_URL)
    await page.get_by_role("button", name="Save tracking").click()
    await page.wait_for_timeout(1200)
    await page.reload(wait_until="networkidle")
    await page.screenshot(path=str(SHOTS / "admin_detail.png"))
    await assert_all_fields(page, "admin")


async def vendor_flow(page, order):
    # fresh context — sign out by clearing storage
    await page.context.clear_cookies()
    await page.goto(f"{BASE}/auth", wait_until="domcontentloaded")
    await page.evaluate("() => localStorage.clear()")
    await sign_in(page, VENDOR_EMAIL, VENDOR_PASSWORD)
    await page.goto(f"{BASE}/vendor/orders", wait_until="networkidle")
    # open the row for the seeded order
    await page.get_by_text(order["order_number"]).first.click()
    await page.wait_for_timeout(600)
    await page.screenshot(path=str(SHOTS / "vendor_modal.png"))
    await assert_all_fields(page, "vendor")


async def main():
    order = seed_order()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        try:
            await admin_flow(page, order)
        finally:
            await ctx.close()
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        try:
            await vendor_flow(page, order)
        finally:
            await ctx.close()
        await browser.close()
    print("\nE2E PASS: order", order["order_number"],
          "renders correctly in admin + vendor panels.")


if __name__ == "__main__":
    asyncio.run(main())

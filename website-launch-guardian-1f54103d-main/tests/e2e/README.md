# E2E: Order visibility

`order_visibility.py` seeds a fully-populated order via the public
`place_order` RPC, then signs in as **admin** and as **vendor** and asserts
that every field renders correctly in both panels.

## Fields verified

- Customer: name, phone, email, address, district, thana
- Line item: name, image, SKU, size, color, variant
- Pricing: subtotal, delivery, total
- Payment: bKash txn id, sender phone
- Notes
- Courier tracking: courier name, tracking number, tracking URL
- Status controls present

## Run

```bash
export ADMIN_EMAIL='...'       ADMIN_PASSWORD='...'
export VENDOR_EMAIL='...'      VENDOR_PASSWORD='...'
export VENDOR_ID='<uuid of approved vendor row>'
# SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are already in the sandbox.
python3 tests/e2e/order_visibility.py
```

Screenshots are written to `tests/e2e/screenshots/`.
Exit code 0 = pass. Any missing field aborts with `AssertionError`.

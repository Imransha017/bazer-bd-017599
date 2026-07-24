
-- 1. coupons: allow anon to read active coupons (guest checkout)
CREATE POLICY "anon read active coupons" ON public.coupons
  FOR SELECT TO anon USING (is_active = true);
GRANT SELECT ON public.coupons TO anon;

-- 2. order_status_history: vendor can read history for their orders
CREATE POLICY "vendor read history" ON public.order_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o
            WHERE o.id = order_status_history.order_id
              AND o.vendor_id IS NOT NULL
              AND o.vendor_id = public.get_my_vendor_id())
  );

-- 3. storage: allow vendors to manage images under their own uid folder in 'products' bucket
CREATE POLICY "Vendor upload own product images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'products'
    AND app_private.has_role(auth.uid(), 'vendor'::public.app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Vendor update own product images" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'products'
    AND app_private.has_role(auth.uid(), 'vendor'::public.app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Vendor delete own product images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'products'
    AND app_private.has_role(auth.uid(), 'vendor'::public.app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. vendors: tighten WITH CHECK so vendors cannot self-set status.
-- The prevent_vendor_status_escalation trigger already blocks status/commission
-- changes by non-admins, but we also harden the policy to only allow status='pending'
-- in the new row image submitted by a vendor (admins use the admin policy).
DROP POLICY IF EXISTS "Vendor can update own row" ON public.vendors;
CREATE POLICY "Vendor can update own row" ON public.vendors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = 'pending'::text);

-- 5. vendors: hide sensitive fields from anon public reads.
DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendors;

-- Public-safe view (runs as view owner; bypasses underlying RLS by default).
CREATE OR REPLACE VIEW public.vendors_public AS
  SELECT id, store_name, slug, logo_url, banner_url, description,
         total_sales, total_orders, created_at
  FROM public.vendors
  WHERE status = 'approved';

GRANT SELECT ON public.vendors_public TO anon, authenticated;

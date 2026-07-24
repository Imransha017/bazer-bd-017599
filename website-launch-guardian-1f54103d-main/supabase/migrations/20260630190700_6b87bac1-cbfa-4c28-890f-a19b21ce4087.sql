
-- 1. coupons_public_exposure: remove anon read; only authenticated users (and server admin via service_role) can read codes
DROP POLICY IF EXISTS "anon read active coupons" ON public.coupons;
REVOKE SELECT ON public.coupons FROM anon;

-- 2. orders_guest_order_enumeration: harden INSERT so callers cannot spoof user_id;
--    guests must insert user_id IS NULL; authenticated users must insert their own user_id.
DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    customer_name IS NOT NULL
    AND customer_phone IS NOT NULL
    AND address IS NOT NULL
    AND jsonb_array_length(items) > 0
    AND total >= 0
    AND (
      (auth.uid() IS NULL AND user_id IS NULL)
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    )
  );

-- 3. user_roles_self_insert_vendor: users may only self-assign the base 'user' role.
--    Vendor role is granted by the server after vendor application approval (admin/service_role).
DROP POLICY IF EXISTS "Users can add own safe roles" ON public.user_roles;
CREATE POLICY "Users can add own user role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'user'::app_role);

-- 4. vendors_sensitive_data_exposure: stop exposing nid/dob/phone/address/rejection_reason publicly.
--    Replace public table policy with a safe view of approved vendors.
DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendors;
REVOKE SELECT ON public.vendors FROM anon;

CREATE OR REPLACE VIEW public.public_vendors
WITH (security_invoker = true) AS
SELECT id, user_id, store_name, slug, logo_url, banner_url, description,
       status, commission_pct, total_sales, total_orders, created_at, updated_at
FROM public.vendors
WHERE status = 'approved';

GRANT SELECT ON public.public_vendors TO anon, authenticated;

-- Re-allow authenticated SELECT on vendors table (own row + admin policies already enforce row scope)
-- Add a narrow policy so the public_vendors view (security_invoker) can read approved rows for anon via the view.
CREATE POLICY "Anon read approved vendor public fields via view" ON public.vendors
  FOR SELECT TO anon
  USING (status = 'approved');
-- Note: anon lacks table-level SELECT GRANT, so direct table queries still fail.
-- The view runs with invoker rights; grant SELECT on the underlying columns only to support the view.
GRANT SELECT (id, user_id, store_name, slug, logo_url, banner_url, description,
              status, commission_pct, total_sales, total_orders, created_at, updated_at)
  ON public.vendors TO anon;

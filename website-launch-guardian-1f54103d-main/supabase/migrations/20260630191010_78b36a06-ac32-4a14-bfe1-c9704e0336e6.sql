
-- 1. coupons_usage_limit_exposed: remove authenticated direct read; expose a validator function instead.
DROP POLICY IF EXISTS "authenticated read active coupons" ON public.coupons;
REVOKE SELECT ON public.coupons FROM authenticated;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  discount numeric;
BEGIN
  SELECT * INTO c FROM public.coupons
    WHERE code = upper(trim(_code)) AND is_active = true
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid coupon code');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon expired');
  END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon usage limit reached');
  END IF;
  IF _subtotal < c.min_order THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Minimum order ৳%s required', c.min_order));
  END IF;
  IF c.discount_type = 'percent' THEN
    discount := round((_subtotal * c.discount_value) / 100);
  ELSE
    discount := c.discount_value;
  END IF;
  IF c.max_discount IS NOT NULL THEN
    discount := least(discount, c.max_discount);
  END IF;
  discount := least(discount, _subtotal);
  RETURN jsonb_build_object('ok', true, 'code', c.code, 'discount', discount);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;

-- 2. vendors_anon_sensitive_fields: remove anon's direct table access entirely.
DROP POLICY IF EXISTS "Anon read approved vendor public fields via view" ON public.vendors;
REVOKE SELECT ON public.vendors FROM anon;
REVOKE SELECT (id, user_id, store_name, slug, logo_url, banner_url, description,
               status, commission_pct, total_sales, total_orders, created_at, updated_at)
  ON public.vendors FROM anon;

-- Make the public_vendors view run with definer rights so anon can read it
-- without any direct grant on the underlying vendors table.
DROP VIEW IF EXISTS public.public_vendors;
CREATE VIEW public.public_vendors
WITH (security_invoker = false) AS
SELECT id, user_id, store_name, slug, logo_url, banner_url, description,
       status, commission_pct, total_sales, total_orders, created_at, updated_at
FROM public.vendors
WHERE status = 'approved';

GRANT SELECT ON public.public_vendors TO anon, authenticated;

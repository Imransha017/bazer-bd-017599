CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION app_private.get_my_vendor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1 $$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.get_my_vendor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_my_vendor_id() TO authenticated, service_role;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_name text,
  ADD COLUMN IF NOT EXISTS subcategory_name text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS product_ids text[] DEFAULT NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS affiliate_id uuid,
  ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS button_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS button_link text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.lookup_order(_order_number text, _phone text)
RETURNS SETOF public.orders LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT * FROM public.orders
   WHERE order_number = _order_number
     AND regexp_replace(customer_phone,'\D','','g') = regexp_replace(_phone,'\D','','g')
   LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_order(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.place_order(_payload jsonb)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; new_num text; uid uuid := auth.uid();
BEGIN
  IF _payload IS NULL THEN RAISE EXCEPTION 'payload required'; END IF;
  IF COALESCE(_payload->>'customer_name','') = '' OR COALESCE(_payload->>'customer_phone','') = '' OR COALESCE(_payload->>'address','') = '' THEN
    RAISE EXCEPTION 'missing required fields';
  END IF;
  IF jsonb_typeof(_payload->'items') <> 'array' OR jsonb_array_length(_payload->'items') = 0 THEN
    RAISE EXCEPTION 'items required';
  END IF;
  INSERT INTO public.orders (
    customer_name, customer_phone, customer_email, address, district, thana,
    items, subtotal, delivery_fee, total, payment_method, payment_type,
    txn_id, sender_phone, paid_amount, notes, vendor_id, user_id
  ) VALUES (
    _payload->>'customer_name', _payload->>'customer_phone',
    NULLIF(_payload->>'customer_email',''), _payload->>'address',
    NULLIF(_payload->>'district',''), NULLIF(_payload->>'thana',''),
    COALESCE(_payload->'items','[]'::jsonb),
    COALESCE((_payload->>'subtotal')::numeric, 0),
    COALESCE((_payload->>'delivery_fee')::numeric, 0),
    COALESCE((_payload->>'total')::numeric, 0),
    COALESCE(_payload->>'payment_method','cod'),
    NULLIF(_payload->>'payment_type',''), NULLIF(_payload->>'txn_id',''),
    NULLIF(_payload->>'sender_phone',''),
    COALESCE((_payload->>'paid_amount')::numeric, 0),
    NULLIF(_payload->>'notes',''),
    NULLIF(_payload->>'vendor_id','')::uuid, uid
  )
  RETURNING orders.id, orders.order_number INTO new_id, new_num;
  id := new_id; order_number := new_num; RETURN NEXT;
END; $$;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric, _items jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.coupons%ROWTYPE; discount numeric; base numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE code = upper(trim(_code)) AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid coupon code'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'Coupon expired'); END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN RETURN jsonb_build_object('ok', false, 'error', 'Coupon usage limit reached'); END IF;
  IF _subtotal < c.min_order THEN RETURN jsonb_build_object('ok', false, 'error', format('Minimum order ৳%s required', c.min_order)); END IF;
  IF c.product_ids IS NOT NULL AND array_length(c.product_ids, 1) > 0 THEN
    IF _items IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'This coupon only works on specific products'); END IF;
    SELECT COALESCE(SUM((i->>'price')::numeric * (i->>'qty')::numeric), 0) INTO base
      FROM jsonb_array_elements(_items) AS i WHERE (i->>'id') = ANY(c.product_ids);
    IF base <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'This coupon does not apply to any item in your cart'); END IF;
  ELSE base := _subtotal; END IF;
  IF c.discount_type = 'percent' THEN discount := round((base * c.discount_value) / 100);
  ELSE discount := c.discount_value; END IF;
  IF c.max_discount IS NOT NULL THEN discount := least(discount, c.max_discount); END IF;
  discount := least(discount, base);
  RETURN jsonb_build_object('ok', true, 'code', c.code, 'discount', discount);
END; $$;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_vendor(_slug text)
RETURNS TABLE (id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text,
  status text, commission_pct numeric, total_sales numeric, total_orders integer, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.created_at, v.updated_at
  FROM public.vendors v WHERE v.slug = _slug AND v.status = 'approved' LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_vendor(text) TO anon, authenticated;

-- Storage policies for products bucket
CREATE POLICY "Public read products bucket" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'products');
CREATE POLICY "Authenticated upload own folder products" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated update own folder products" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated delete own folder products" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);

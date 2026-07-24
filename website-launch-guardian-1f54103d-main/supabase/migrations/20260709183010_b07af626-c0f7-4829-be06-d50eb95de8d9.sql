
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric, _items jsonb DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.coupons%ROWTYPE;
  discount numeric;
  base numeric;
  matched_ids text[];
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

  IF c.product_ids IS NOT NULL AND array_length(c.product_ids, 1) > 0 THEN
    IF _items IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This coupon only works on specific products');
    END IF;
    SELECT COALESCE(SUM((i->>'price')::numeric * (i->>'qty')::numeric), 0)
      INTO base
      FROM jsonb_array_elements(_items) AS i
     WHERE (i->>'id') = ANY(c.product_ids);
    IF base <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This coupon does not apply to any item in your cart');
    END IF;
  ELSE
    base := _subtotal;
  END IF;

  IF c.discount_type = 'percent' THEN
    discount := round((base * c.discount_value) / 100);
  ELSE
    discount := c.discount_value;
  END IF;
  IF c.max_discount IS NOT NULL THEN
    discount := least(discount, c.max_discount);
  END IF;
  discount := least(discount, base);
  RETURN jsonb_build_object('ok', true, 'code', c.code, 'discount', discount);
END;
$function$;

-- Drop the transitional 4-arg variant so there is one canonical signature
DROP FUNCTION IF EXISTS public.validate_coupon(text, numeric, text[], numeric);

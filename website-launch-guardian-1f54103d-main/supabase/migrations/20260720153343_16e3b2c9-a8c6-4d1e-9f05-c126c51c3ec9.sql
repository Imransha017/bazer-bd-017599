CREATE OR REPLACE FUNCTION public.place_order(_payload jsonb)
 RETURNS TABLE(id uuid, order_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id uuid; new_num text; uid uuid := auth.uid(); it jsonb; pid uuid; q int;
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

  -- Auto-decrement stock (skip permanent "In stock" sentinel = 999999)
  FOR it IN SELECT * FROM jsonb_array_elements(_payload->'items') LOOP
    pid := NULLIF(it->>'id','')::uuid;
    q := GREATEST(COALESCE((it->>'qty')::int, 1), 1);
    IF pid IS NOT NULL THEN
      UPDATE public.products
         SET stock = GREATEST(stock - q, 0)
       WHERE id = pid AND stock < 999999 AND stock > 0;
    END IF;
  END LOOP;

  id := new_id; order_number := new_num; RETURN NEXT;
END; $function$;
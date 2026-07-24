
-- Courier tracking on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text;

-- Public lookup for guest orders by order_number + phone
CREATE OR REPLACE FUNCTION public.lookup_order(_order_number text, _phone text)
RETURNS SETOF public.orders
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT * FROM public.orders
   WHERE order_number = _order_number
     AND regexp_replace(customer_phone,'\D','','g') = regexp_replace(_phone,'\D','','g')
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_order(text, text) TO anon, authenticated;

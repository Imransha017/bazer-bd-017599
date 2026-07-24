
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS product_id text;
ALTER TABLE public.affiliate_commissions ADD COLUMN IF NOT EXISTS product_id text;

CREATE OR REPLACE FUNCTION public.track_affiliate_click(_code text, _path text DEFAULT NULL, _ref text DEFAULT NULL, _ua text DEFAULT NULL, _product_id text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE aff_id UUID;
BEGIN
  SELECT id INTO aff_id FROM public.affiliates WHERE code = _code AND status = 'approved' LIMIT 1;
  IF aff_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.affiliate_clicks (affiliate_id, landing_path, referer, user_agent, product_id)
    VALUES (aff_id, _path, _ref, _ua, _product_id);
  UPDATE public.affiliates SET total_clicks = total_clicks + 1 WHERE id = aff_id;
  RETURN aff_id;
END; $$;

CREATE OR REPLACE FUNCTION public.attribute_order_to_affiliate(_order_id uuid, _code text, _product_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE aff public.affiliates%ROWTYPE; s public.affiliate_settings%ROWTYPE; o public.orders%ROWTYPE; pct NUMERIC; amt NUMERIC;
BEGIN
  SELECT * INTO s FROM public.affiliate_settings WHERE id = 1;
  IF NOT s.is_enabled THEN RETURN; END IF;
  SELECT * INTO aff FROM public.affiliates WHERE code = _code AND status = 'approved' LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN; END IF;
  pct := COALESCE(aff.commission_pct, s.commission_pct);
  amt := ROUND((o.total * pct) / 100, 2);
  UPDATE public.orders SET affiliate_id = aff.id, affiliate_code = _code WHERE id = _order_id;
  INSERT INTO public.affiliate_commissions (affiliate_id, order_id, order_total, commission_pct, amount, product_id, status)
    VALUES (aff.id, _order_id, o.total, pct, amt, _product_id, 'pending');
  UPDATE public.affiliates SET total_orders = total_orders + 1 WHERE id = aff.id;
END; $$;

CREATE OR REPLACE FUNCTION public.affiliate_commissions_on_order_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF lower(NEW.status) = 'delivered' THEN
      UPDATE public.affiliate_commissions SET status = 'approved'
       WHERE order_id = NEW.id AND status = 'pending';
    ELSIF lower(NEW.status) IN ('cancelled','canceled','refunded','returned') THEN
      UPDATE public.affiliate_commissions SET status = 'rejected'
       WHERE order_id = NEW.id AND status IN ('pending','approved');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_affiliate_commissions_on_order_status ON public.orders;
CREATE TRIGGER trg_affiliate_commissions_on_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.affiliate_commissions_on_order_status();

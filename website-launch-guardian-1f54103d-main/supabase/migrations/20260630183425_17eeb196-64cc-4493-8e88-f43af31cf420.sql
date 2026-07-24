
-- 1. Coupons: remove anon read
DROP POLICY IF EXISTS "public read active coupons" ON public.coupons;
CREATE POLICY "authenticated read active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (is_active = true OR app_private.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.coupons FROM anon;

-- 2. Order status history: restrict to order owner or admin
DROP POLICY IF EXISTS "public read history" ON public.order_status_history;
CREATE POLICY "owner read history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.user_id = auth.uid()
    )
  );
REVOKE SELECT ON public.order_status_history FROM anon;

-- 3. Vendors: prevent self status escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_vendor_status_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT app_private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change vendor status';
  END IF;
  IF NEW.commission_pct IS DISTINCT FROM OLD.commission_pct
     AND NOT app_private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change commission';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_prevent_status_escalation ON public.vendors;
CREATE TRIGGER vendors_prevent_status_escalation
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.prevent_vendor_status_escalation();

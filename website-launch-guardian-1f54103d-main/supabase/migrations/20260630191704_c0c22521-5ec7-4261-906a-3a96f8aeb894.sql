
-- Lock down SECURITY DEFINER function execution; only expose the RPCs that need it.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Re-grant only the intentional RPCs
GRANT EXECUTE ON FUNCTION public.get_public_vendor(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_vendor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Strengthen vendor self-update trigger to block all financial / status fields.
CREATE OR REPLACE FUNCTION public.prevent_vendor_status_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT app_private.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Only admins can change vendor status';
    END IF;
    IF NEW.commission_pct IS DISTINCT FROM OLD.commission_pct THEN
      RAISE EXCEPTION 'Only admins can change commission';
    END IF;
    IF NEW.total_sales IS DISTINCT FROM OLD.total_sales THEN
      RAISE EXCEPTION 'Only admins can change total_sales';
    END IF;
    IF NEW.total_orders IS DISTINCT FROM OLD.total_orders THEN
      RAISE EXCEPTION 'Only admins can change total_orders';
    END IF;
    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'Only admins can change rejection_reason';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Cannot change vendor owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS prevent_vendor_status_escalation_trg ON public.vendors;
CREATE TRIGGER prevent_vendor_status_escalation_trg
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.prevent_vendor_status_escalation();

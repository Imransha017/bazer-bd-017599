
CREATE OR REPLACE FUNCTION public.grant_vendor_role_on_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'vendor'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_grant_role ON public.vendors;
CREATE TRIGGER vendors_grant_role
AFTER INSERT ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.grant_vendor_role_on_apply();

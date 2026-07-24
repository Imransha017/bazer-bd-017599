
DROP VIEW IF EXISTS public.affiliate_settings_public;
CREATE VIEW public.affiliate_settings_public
WITH (security_invoker = on) AS
  SELECT id, is_enabled, commission_pct, cookie_days
  FROM public.affiliate_settings
  WHERE id = 1;

GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;

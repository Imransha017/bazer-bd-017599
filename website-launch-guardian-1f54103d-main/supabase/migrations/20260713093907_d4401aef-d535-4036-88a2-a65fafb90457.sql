
-- ============ dropshippers: remove broad public policy; expose only via view ============
DROP POLICY IF EXISTS "public safe columns of approved dropshippers" ON public.dropshippers;
REVOKE ALL ON public.dropshippers FROM anon;
REVOKE ALL ON public.dropshippers FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshippers TO authenticated;

DROP VIEW IF EXISTS public.dropshippers_public;
CREATE VIEW public.dropshippers_public AS
  SELECT id, code, store_name, store_slug, logo_url, banner_url, bio, status
  FROM public.dropshippers
  WHERE status = 'approved';
ALTER VIEW public.dropshippers_public SET (security_invoker = off);
GRANT SELECT ON public.dropshippers_public TO anon, authenticated;

-- ============ affiliate_settings: admin-only base; safe fields via view ============
DROP POLICY IF EXISTS "settings public read via view" ON public.affiliate_settings;
REVOKE ALL ON public.affiliate_settings FROM anon;
REVOKE ALL ON public.affiliate_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_settings TO authenticated;

DROP VIEW IF EXISTS public.affiliate_settings_public;
CREATE VIEW public.affiliate_settings_public AS
  SELECT id, is_enabled, commission_pct, cookie_days
  FROM public.affiliate_settings
  WHERE id = 1;
ALTER VIEW public.affiliate_settings_public SET (security_invoker = off);
GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;

-- ============ site_settings: admin-only base; public view exposes safe blob ============
DROP POLICY IF EXISTS "Site settings are publicly readable" ON public.site_settings;
REVOKE ALL ON public.site_settings FROM anon;
REVOKE ALL ON public.site_settings FROM authenticated;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;

CREATE POLICY "Admins can view site settings"
  ON public.site_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP VIEW IF EXISTS public.site_settings_public;
CREATE VIEW public.site_settings_public AS
  SELECT id, settings, updated_at
  FROM public.site_settings
  WHERE id = 1;
ALTER VIEW public.site_settings_public SET (security_invoker = off);
GRANT SELECT ON public.site_settings_public TO anon, authenticated;

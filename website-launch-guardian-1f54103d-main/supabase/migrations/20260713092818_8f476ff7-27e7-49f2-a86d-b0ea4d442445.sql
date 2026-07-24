
-- Replace views with security_invoker=on to satisfy the linter
DROP VIEW IF EXISTS public.affiliate_settings_public;
CREATE VIEW public.affiliate_settings_public
WITH (security_invoker = on) AS
  SELECT id, is_enabled, commission_pct, min_payout, cookie_days, terms
  FROM public.affiliate_settings
  WHERE id = 1;

DROP VIEW IF EXISTS public.dropshippers_public;
CREATE VIEW public.dropshippers_public
WITH (security_invoker = on) AS
  SELECT id, code, store_name, store_slug, logo_url, banner_url, bio, status
  FROM public.dropshippers
  WHERE status = 'approved';

-- ============ affiliate_settings ============
-- The view runs as the caller. Add a permissive SELECT policy limited to
-- id=1 so the view can be read; column-level grants restrict what columns
-- anon can actually read.
DROP POLICY IF EXISTS "settings public read via view" ON public.affiliate_settings;
CREATE POLICY "settings public read via view"
  ON public.affiliate_settings FOR SELECT
  USING (id = 1);

-- anon: only the safe columns
GRANT SELECT (id, is_enabled, commission_pct, cookie_days)
  ON public.affiliate_settings TO anon;
GRANT SELECT (id, is_enabled, commission_pct, min_payout, cookie_days, terms)
  ON public.affiliate_settings TO authenticated;

GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;

-- ============ dropshippers ============
DROP POLICY IF EXISTS "public safe columns of approved dropshippers" ON public.dropshippers;
CREATE POLICY "public safe columns of approved dropshippers"
  ON public.dropshippers FOR SELECT
  USING (status = 'approved');

-- anon: only safe storefront columns
GRANT SELECT (id, code, store_name, store_slug, logo_url, banner_url, bio, status)
  ON public.dropshippers TO anon;
-- authenticated retains full column grants (owner/admin need them; RLS still
-- limits which rows non-owners/non-admins can see beyond approved)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshippers TO authenticated;

GRANT SELECT ON public.dropshippers_public TO anon, authenticated;
